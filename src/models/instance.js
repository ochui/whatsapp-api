'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Instance extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Instance.init({
    wid: DataTypes.STRING,
    webhookUrl: DataTypes.STRING,
    authToken: DataTypes.STRING,
    name: DataTypes.STRING,
    sessionId: DataTypes.STRING,
    status: DataTypes.STRING,
    phoneNumber: DataTypes.STRING,
    settings: DataTypes.JSONB
  }, {
    sequelize,
    modelName: 'Instance',
  });
  return Instance;
};