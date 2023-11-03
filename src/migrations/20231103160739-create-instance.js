'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Instances', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      wid: {
        type: Sequelize.STRING
      },
      webhookUrl: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      authToken: {
        type: Sequelize.STRING
      },
      name: {
        type: Sequelize.STRING
      },
      sessionId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING
      },
      phoneNumber: {
        type: Sequelize.STRING
      },
      settings: {
        type: Sequelize.JSONB,
        defaultValue: {
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
        },
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Instances');
  }
};