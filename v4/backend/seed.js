require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to DB for seeding...');
        
        // Clear old users
        await User.deleteMany({});
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('safex2026', salt);

        // Create Admin
        await User.create({
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            fullName: 'Central Command Admin'
        });

        // Create Worker
        await User.create({
            username: 'worker1',
            password: hashedPassword,
            role: 'worker',
            fullName: 'Alex Santos (W-402)'
        });

        console.log('Database seeded successfully!');
        console.log('Admin login -> User: admin | Pass: safex2026');
        console.log('Worker login -> User: worker1 | Pass: safex2026');
        
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
