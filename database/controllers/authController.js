require('dotenv').config();

const pool = require('../db_connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


// ===============================
// REGISTER USER
// ===============================

async function registerUser(req, res) {

    const {
        full_name,
        phone_number,
        email,
        pin,
        confirm_pin,
        national_id,
        account_type,
        business_name,
        trade_license,
        organization_name,
        service_name,
        commission_rate
    } = req.body;


    // ===============================
    // BASIC VALIDATION
    // ===============================

    if (!full_name || !phone_number || !pin || !confirm_pin) {
        return res.status(400).json({
            error: 'Full name, phone number and PIN are required'
        });
    }


    // ===============================
    // PIN VALIDATION
    // ===============================

    if (pin !== confirm_pin) {
        return res.status(400).json({
            error: 'PINs do not match'
        });
    }

    const pinRegex = /^\d{4,6}$/;

    if (!pinRegex.test(pin)) {
        return res.status(400).json({
            error: 'PIN must be between 4 and 6 digits and contain only numbers'
        });
    }


    // ===============================
    // PHONE NORMALIZATION
    // ===============================

    let normalizedPhone = phone_number.trim();

    // +8801712345678
    if (normalizedPhone.startsWith('+880')) {
        normalizedPhone = '0' + normalizedPhone.substring(4);
    }

    // 8801712345678
    else if (normalizedPhone.startsWith('880')) {
        normalizedPhone = '0' + normalizedPhone.substring(3);
    }


    // ===============================
    // PHONE VALIDATION
    // ===============================

    const phoneRegex = /^01[3-9]\d{8}$/;

    if (!phoneRegex.test(normalizedPhone)) {
        return res.status(400).json({
            error: 'Invalid phone number. Use 11 digit number like 01712345678'
        });
    }


    // ===============================
    // NID VALIDATION
    // ===============================

    // NID is optional according to your frontend
    if (national_id) {

        const nidRegex = /^\d{10}$/;

        if (!nidRegex.test(national_id)) {
            return res.status(400).json({
                error: 'Invalid NID. NID must contain exactly 10 digits'
            });
        }
    }


    // ===============================
    // EMAIL VALIDATION
    // ===============================

    if (email) {

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }
    }


    // ===============================
    // AGENT VALIDATION
    // ===============================

    let agentCommission = 1.50;

    if (account_type === 'AGENT') {

        if (!business_name) {
            return res.status(400).json({
                error: 'Business name is required for Agent account'
            });
        }

        // If user provides commission
        if (
            commission_rate !== undefined &&
            commission_rate !== null &&
            commission_rate !== ''
        ) {

            agentCommission = Number(commission_rate);

            if (isNaN(agentCommission)) {
                return res.status(400).json({
                    error: 'Commission rate must be a number'
                });
            }
        }

        if (agentCommission < 0 || agentCommission > 100) {
            return res.status(400).json({
                error: 'Commission rate must be between 0% and 100%'
            });
        }
    }


    // ===============================
    // DATABASE TRANSACTION
    // ===============================

    try {

        await pool.query('BEGIN');


        // ===============================
        // CHECK EXISTING USER
        // ===============================

        const userCheck = await pool.query(
            `
            SELECT user_id
            FROM users
            WHERE phone_number = $1
               OR (email IS NOT NULL AND email = $2)
            `,
            [
                normalizedPhone,
                email || null
            ]
        );


        if (userCheck.rows.length > 0) {

            await pool.query('ROLLBACK');

            return res.status(400).json({
                error: 'User with this phone or email already exists'
            });
        }


        // ===============================
        // HASH PIN
        // ===============================

        const saltRounds = 10;

        const pin_hash = await bcrypt.hash(
            pin,
            saltRounds
        );


        // ===============================
        // CREATE USER
        // ===============================

        const userResult = await pool.query(
            `
            INSERT INTO users
            (
                full_name,
                phone_number,
                email,
                pin_hash,
                national_id
            )
            VALUES ($1, $2, $3, $4, $5)

            RETURNING
                user_id,
                full_name,
                phone_number,
                email,
                created_at
            `,
            [
                full_name,
                normalizedPhone,
                email || null,
                pin_hash,
                national_id || null
            ]
        );


        const newUserId = userResult.rows[0].user_id;


        // ===============================
        // CREATE ACCOUNT
        // ===============================

        await pool.query(
            `
            INSERT INTO accounts
            (
                user_id,
                account_type
            )
            VALUES ($1, $2)
            `,
            [
                newUserId,
                account_type || 'PERSONAL'
            ]
        );


        // ===============================
        // PERSONAL
        // ===============================

        if (account_type === 'PERSONAL' || !account_type) {

            await pool.query(
                `
                INSERT INTO personal_accounts
                (user_id)
                VALUES ($1)
                `,
                [newUserId]
            );
        }


        // ===============================
        // AGENT
        // ===============================

        else if (account_type === 'AGENT') {

            await pool.query(
                `
                INSERT INTO agents
                (
                    user_id,
                    business_name,
                    commission_rate
                )
                VALUES ($1, $2, $3)
                `,
                [
                    newUserId,
                    business_name,
                    agentCommission
                ]
            );
        }


        // ===============================
        // MERCHANT
        // ===============================

        else if (account_type === 'BUSINESS') {

            await pool.query(
                `
                INSERT INTO merchants
                (
                    user_id,
                    business_name,
                    trade_license
                )
                VALUES ($1, $2, $3)
                `,
                [
                    newUserId,
                    business_name,
                    trade_license || null
                ]
            );
        }


        // ===============================
        // BILLER
        // ===============================

        else if (account_type === 'BILLER') {

            const billerResult = await pool.query(
                `
                INSERT INTO billers
                (user_id)
                VALUES ($1)

                RETURNING biller_id
                `,
                [newUserId]
            );


            const newBillerId =
                billerResult.rows[0].biller_id;


            await pool.query(
                `
                INSERT INTO services
                (
                    biller_id,
                    service_name,
                    organization_name
                )
                VALUES ($1, $2, $3)
                `,
                [
                    newBillerId,
                    service_name,
                    organization_name
                ]
            );
        }


        // ===============================
        // COMMIT
        // ===============================

        await pool.query('COMMIT');


        // ===============================
        // RESPONSE
        // ===============================

        res.status(201).json({

            message: 'User registered successfully! 🎉',

            user: {
                ...userResult.rows[0],
                role: account_type || 'PERSONAL',
                account_type: account_type || 'PERSONAL'
            }
        });


    } catch (err) {

        await pool.query('ROLLBACK');

        console.error(
            'Error registering user:',
            err
        );

        res.status(500).json({
            error: 'Server error during registration'
        });
    }
}


// ===============================
// LOGIN USER
// ===============================

async function loginUser(req, res) {

    const {
        phone_number,
        pin
    } = req.body;


    if (!phone_number || !pin) {

        return res.status(400).json({
            error: 'Phone number and PIN are required'
        });
    }


    try {

        const result = await pool.query(
            `
            SELECT
                u.*,
                a.role AS admin_role,
                a.permission_level,
                acc.account_type

            FROM users u

            LEFT JOIN admins a
                ON u.user_id = a.user_id

            LEFT JOIN accounts acc
                ON u.user_id = acc.user_id

            WHERE u.phone_number = $1
            `,
            [phone_number]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                error: 'User not found'
            });
        }


        const user = result.rows[0];


        const isPinValid =
            await bcrypt.compare(
                pin,
                user.pin_hash
            );


        if (!isPinValid) {

            return res.status(401).json({
                error: 'Invalid PIN'
            });
        }


        const userRole =
            user.admin_role ||
            user.account_type ||
            'PERSONAL';


        const token = jwt.sign(

            {
                user_id: user.user_id,
                phone: user.phone_number,
                role: userRole,
                permission_level:
                    user.permission_level || 0
            },

            process.env.JWT_SECRET,

            {
                expiresIn: '7d'
            }
        );


        res.json({

            message: 'Login successful! 🚀',

            token,

            user: {

                user_id: user.user_id,
                full_name: user.full_name,
                phone_number: user.phone_number,
                email: user.email,

                role: userRole,

                account_type:
                    user.account_type,

                permission_level:
                    user.permission_level || 0
            }
        });


    } catch (err) {

        console.error(
            'Error logging in:',
            err.message
        );

        res.status(500).json({
            error: 'Server error during login'
        });
    }
}


module.exports = {
    registerUser,
    loginUser
};