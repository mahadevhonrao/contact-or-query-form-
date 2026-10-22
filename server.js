
require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Configure Gmail SMTP
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify the SMTP configuration at startup
transporter.verify()
    .then(() => {
        console.log("Email server is ready.");
    })
    .catch((error) => {
        console.error("Email configuration error:", error.message);
    });

// Handle form submission
app.post("/send-query", async (req, res) => {
    try {
        const { fullName, contact, email, message } = req.body;

        // Check that all fields are strings
        if (
            typeof fullName !== "string" ||
            typeof contact !== "string" ||
            typeof email !== "string" ||
            typeof message !== "string"
        ) {
            return res.status(400).json({
                message: "Please provide valid form details."
            });
        }

        const name = fullName.trim();
        const phone = contact.trim();
        const senderEmail = email.trim();
        const query = message.trim();

        // Validate required fields and lengths
        if (!name || !phone || !senderEmail || !query) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        if (
            name.length > 100 ||
            phone.length > 20 ||
            senderEmail.length > 254 ||
            query.length > 5000
        ) {
            return res.status(400).json({
                message: "One or more fields exceed the allowed length."
            });
        }

        // Basic email format check
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(senderEmail)) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        if (!/^[0-9+().\-\s]{7,20}$/.test(phone)) {
            return res.status(400).json({
                message: "Please enter a valid contact number."
            });
        }

        // Send email to your inbox
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.RECEIVER_EMAIL,
            replyTo: senderEmail,
            subject: `New Website Query from ${name}`,
            text: [
                "You received a new query from your website.",
                "",
                `Full Name: ${name}`,
                `Contact Number: ${phone}`,
                `Email Address: ${senderEmail}`,
                "",
                "Query / Message:",
                query
            ].join("\n")
        });

        return res.status(200).json({
            message: "Your message has been sent successfully!"
        });

    } catch (error) {
        console.error("Failed to send query:", error.message);

        return res.status(500).json({
            message: "Unable to send your message right now. Please try again later."
        });
    }
});

// Handle invalid JSON requests
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400) {
        return res.status(400).json({
            message: "Invalid request data."
        });
    }

    next(error);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
