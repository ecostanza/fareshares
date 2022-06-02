
const nodemailer = require("nodemailer");
const dotenv = require('dotenv');
dotenv.config();

async function send_report(html_report, txt_report, subject) {
  if (subject === undefined) {
    subject = "Pricelist Update";
  }

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: process.env.SMTP_PORT,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER, 
      pass: process.env.SMTP_PASS 
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: `"Fareshares App Agent" <${process.env.SMTP_USER}>`, // sender address
    to: process.env.REPORT_RECIPIENTS, //"e.costanza@ieee.org", // list of receivers
    subject: subject, // Subject line
    text: txt_report, // plain text body
    html: html_report, // html body
  });

  console.log("Message sent: %s", info.messageId);
}

// main().catch(console.error);
module.exports = {
    'send_report': send_report
}
//