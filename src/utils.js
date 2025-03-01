const axios = require('axios')
const crypto = require('crypto');

const { globalApiKey, disabledCallbacks } = require('./config/config')

// Trigger webhook endpoint
const triggerWebhook = (webhookURL, sessionId, authToken, dataType, data) => {

  const secretKey = authToken || globalApiKey;

  if (!data) {
    data = dataType;
  }

  const hmac = crypto.createHmac('sha512', secretKey);
  const sortedData = JSON.stringify(data, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).sort().reduce((sorted, key) => {
        sorted[key] = value[key];
        return sorted;
      }, {});
    }

    return value;
  });
  hmac.update(sortedData);
  const signature = hmac.digest('hex');

  axios.post(webhookURL, {
    dataType, data, sessionId
  }, {
    headers: {
      'x-api-key': globalApiKey,
      'x-signature': signature,
      'User-Agent': 'Whatsapp/1.0.0 (Calabary.com)'
    }
  }).catch(error => console.error('Failed to send new message webhook:', sessionId, dataType, error.message, data))
}

// Function to send a response with error status and message
const sendErrorResponse = (res, status, message) => {
  res.status(status).json({ success: false, error: message })
}

// Function to wait for a specific item not to be null
const waitForNestedObject = (rootObj, nestedPath, maxWaitTime = 10000, interval = 100) => {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const checkObject = () => {
      const nestedObj = nestedPath.split('.').reduce((obj, key) => obj ? obj[key] : undefined, rootObj)
      if (nestedObj) {
        // Nested object exists, resolve the promise
        resolve()
      } else if (Date.now() - start > maxWaitTime) {
        // Maximum wait time exceeded, reject the promise
        console.log('Timed out waiting for nested object')
        reject(new Error('Timeout waiting for nested object'))
      } else {
        // Nested object not yet created, continue waiting
        setTimeout(checkObject, interval)
      }
    }
    checkObject()
  })
}

const checkIfEventisEnabled = (event, enabledCallbacks) => {
  return new Promise((resolve, reject) => {
    if (enabledCallbacks.includes(event)) {
      resolve()
    }
  })
}

module.exports = {
  triggerWebhook,
  sendErrorResponse,
  waitForNestedObject,
  checkIfEventisEnabled
}
