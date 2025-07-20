require('dotenv').config();
const { ethers, JsonRpcProvider } = require('ethers');
const axios = require('axios');
const moment = require('moment-timezone');
const readline = require('readline');

const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    white: '\x1b[37m',
    bold: '\x1b[1m',
    blue: '\x1b[34m', // Added blue for countdown
    magenta: '\x1b[35m', // Added magenta for banner
};

const logger = {
    info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}[⚠️] ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
    loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
    step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
    countdown: (msg) => process.stdout.write(`\r${colors.blue}[⏰] ${msg}${colors.reset}`),
    section: (msg) => { // Re-added the section function
        const line = '='.repeat(50);
        console.log(`\n${colors.cyan}${line}${colors.reset}`);
        if (msg) console.log(`${colors.cyan}${msg}${colors.reset}`);
        console.log(`${colors.cyan}${line}${colors.reset}\n`);
    },
    banner: () => {
        const { cyan, magenta, reset } = colors;
        console.log(magenta + '=============================================' + reset);
        console.log(cyan + '  🍉🍉PLEASE SUPPORT PALESTINE ON SOCIAL MEDIA 🍉🍉 ' + reset);
        console.log(cyan + '        19Senniman from Insider' + reset);
        console.log(magenta + '=============================================' + reset);
        console.log();
    }
};
