const { createTransport } = require('nodemailer');
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqs = new SQSClient({
  region: process.env.AWS_REGION
});

async function sendMailAws(mailData){
  const params = {
    QueueUrl: process.env.AWS_SQS_MAIL_QUEUE_URL,
    MessageBody: JSON.stringify({ mailData: mailData })
  };
  try {
    const result = await sqs.send(new SendMessageCommand(params));
    return { success: true, result };
  } catch (error) {
    return { success: false, error };
  }
  
}



const transport = createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: true,
  auth: {
    user: process.env.MAIL_ADRESS,
    pass: process.env.MAIL_APP_PASSWORD
  }
});

async function sendMail({ to, subject, html }) {
  try {
    const result = await transport.sendMail({ to, subject: `[${process.env.APP_NAME}]${subject}`, html });
    return { success: true, result };
  } catch (error) {
    return { success: false, error };
  }
}



module.exports = { sendMail, sendMailAws }