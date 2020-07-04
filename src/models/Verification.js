const { Sequelize, DataTypes, Model } = require("sequelize");
const databaseConfig = require("../config/database");

const sequelize = new Sequelize(databaseConfig.url, databaseConfig);

class Verification extends Model {}

Verification.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    forum_username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    verification_message_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    verification_post_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Verification",
  }
);

module.exports = {
  Verification,
};
