
const qr = require('qr-image')
const { v4: uuidv4 } = require('uuid');

const { setupSession, deleteSession, validateSession, flushSessions, sessions } = require('../sessions')
const { sendErrorResponse, waitForNestedObject } = require('../utils')

const db = require('../models')
const { Instance } = db;

/**
 * Starts a session for the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error starting the session.
 */
const startSession = async (req, res) => {
  /*
    #swagger.summary = 'Start new session'
    #swagger.description = 'Starts a session for the given session ID.'
      #swagger.requestBody = {
        required: true,
        schema: {
          type: 'object',
          properties: {
            webhookUrl: {
              type: 'string',
              description: 'URL for the webhook to receive events from the client',
              example: 'https://webhook.site/0d0d0d0d-0d0d-0d0d-0d0d-0d0d0d0d0d0d'
            },
            name: {
              type: 'string',
              description: 'Name of the session',
              example: 'My Session'
            },
            phoneNumber: {
              type: 'string',
              description: 'Phone number of the session',
              example: '234567890123'
            },
            settings: {
              type: 'object',
              description: 'Settings of the session',
              example: {
                "enabledCallbacks": ['auth_failure', 'authenticated', 'call', 'change_state', 'disconnected', 'loading_screen', 'media_uploaded', 'message', 'message_ack', 'message_create', 'message_reaction', 'message_revoke_everyone', 'qr', 'ready', 'media'],
                "alwaysOnline": false,
                "markReadOnReply": true,
                "sendingDelay": 1000
              }
            },
          }
        }
      }
    */

  const sessionId = req.params.sessionId

  try {
    const { webhookUrl, name, phoneNumber, settings } = req.body

    instance_settings_default = {
      enabledCallbacks: [
        "auth_failure",
        "authenticated",
        "call",
        "change_state",
        "disconnected",
        "loading_screen",
        "media_uploaded",
        "message",
        "message_ack",
        "message_create",
        "message_reaction",
        "message_revoke_everyone",
        "qr",
        "ready",
        "media"
      ],
      alwaysOnline: false,
      markReadOnReply: true,
      sendingDelay: 1000,
    }

    const [instance, created] = await Instance.findOrCreate({
      where: { sessionId: sessionId },
      defaults: {
        // wid: setupSessionReturn.client.info.wid,
        webhookUrl: webhookUrl,
        authToken: uuidv4(),
        name: name,
        sessionId: sessionId,
        status: 'session_not_connected',
        phoneNumber: phoneNumber,
        settings: settings || instance_settings_default,
      }
    })


    const setupSessionReturn = setupSession(sessionId, instance)
    if (!setupSessionReturn.success) {
      /* #swagger.responses[422] = {
        description: "Unprocessable Entity.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
      sendErrorResponse(res, 422, setupSessionReturn.message)
      return
    }
    /* #swagger.responses[200] = {
      description: "Status of the initiated session.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/StartSessionResponse" }
        }
      }
    }
    */
    // wait until the client is created


    await waitForNestedObject(setupSessionReturn.client, 'pupPage')

    return res.json({
      success: true,
      message: setupSessionReturn.message,
      data: instance
    })

    // waitForNestedObject(setupSessionReturn.client, '')
    //   .then(() => {
    //     return res.json({
    //       success: true,
    //       message: setupSessionReturn.message
    //     })
    //   })
    //   .catch((err) => { sendErrorResponse(res, 500, err.message) })
  } catch (error) {
    /* #swagger.responses[500] = {
        description: "Server Failure.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
    console.log('startSession ERROR', error)
    // delete instance if it was created
    const instance = await Instance.findOne({ where: { sessionId: sessionId } })
    if (instance) {
      await instance.destroy()
    }
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Status of the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error getting status of the session.
 */
const statusSession = async (req, res) => {
  // #swagger.summary = 'Get session status'
  // #swagger.description = 'Status of the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const sessionData = await validateSession(sessionId)
    /* #swagger.responses[200] = {
      description: "Status of the session.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/StatusSessionResponse" }
        }
      }
    }
    */

    const instance = await Instance.findOne({ where: { sessionId: sessionId } })
    if (instance) {
      sessionData.data = instance
    }
    res.json(sessionData)
  } catch (error) {
    console.log('statusSession ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * QR code of the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error getting status of the session.
 */
const sessionQrCode = async (req, res) => {
  // #swagger.summary = 'Get session QR code'
  // #swagger.description = 'QR code of the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const session = sessions.get(sessionId)
    if (!session) {
      return res.json({ success: false, message: 'session_not_found' })
    }
    if (session.qr) {
      return res.json({ success: true, qr: session.qr })
    }
    return res.json({ success: false, message: 'qr code not ready or already scanned' })
  } catch (error) {
    console.log('sessionQrCode ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * QR code as image of the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error getting status of the session.
 */
const sessionQrCodeImage = async (req, res) => {
  // #swagger.summary = 'Get session QR code as image'
  // #swagger.description = 'QR code as image of the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const session = sessions.get(sessionId)
    if (!session) {
      return res.json({ success: false, message: 'session_not_found' })
    }
    if (session.qr) {
      const qrImage = qr.image(session.qr)
      /* #swagger.responses[200] = {
          description: "QR image.",
          content: {
            "image/png": {}
          }
        }
      */
      res.writeHead(200, {
        'Content-Type': 'image/png'
      })
      return qrImage.pipe(res)
    }
    return res.json({ success: false, message: 'qr code not ready or already scanned' })
  } catch (error) {
    console.log('sessionQrCodeImage ERROR', error)
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Terminates the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to terminate.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the session.
 */
const terminateSession = async (req, res) => {
  // #swagger.summary = 'Terminate session'
  // #swagger.description = 'Terminates the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId
    const validation = await validateSession(sessionId)
    if (validation.message === 'session_not_found') {
      return res.json(validation)
    }
    await deleteSession(sessionId, validation)

    // delete instance
    const instance = await Instance.findOne({ where: { sessionId: sessionId } })
    if (instance) {
      await instance.destroy()
    }

    /* #swagger.responses[200] = {
      description: "Sessions terminated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TerminateSessionResponse" }
        }
      }
    }
    */
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('terminateSession ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Terminates all inactive sessions.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the sessions.
 */
const terminateInactiveSessions = async (req, res) => {
  // #swagger.summary = 'Terminate inactive sessions'
  // #swagger.description = 'Terminates all inactive sessions.'
  try {
    await flushSessions(true)
    /* #swagger.responses[200] = {
      description: "Sessions terminated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TerminateSessionsResponse" }
        }
      }
    }
    */
    res.json({ success: true, message: 'Flush completed successfully' })
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('terminateInactiveSessions ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

/**
 * Terminates all sessions.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the sessions.
 */
const terminateAllSessions = async (req, res) => {
  // #swagger.summary = 'Terminate all sessions'
  // #swagger.description = 'Terminates all sessions.'
  try {
    await flushSessions(false)
    /* #swagger.responses[200] = {
      description: "Sessions terminated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TerminateSessionsResponse" }
        }
      }
    }
    */
    res.json({ success: true, message: 'Flush completed successfully' })
  } catch (error) {
    /* #swagger.responses[500] = {
        description: "Server Failure.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
    console.log('terminateAllSessions ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

module.exports = {
  startSession,
  statusSession,
  sessionQrCode,
  sessionQrCodeImage,
  terminateSession,
  terminateInactiveSessions,
  terminateAllSessions
}
