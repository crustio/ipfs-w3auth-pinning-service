import {sequelize} from '../db/db';
import * as Sequelize from 'sequelize';

const Users = sequelize.define(
  'user',
  {
    id: {
      type: Sequelize.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    chain_type: {
      type: Sequelize.STRING(32),
      allowNull: false,
    },
    address: {
      type: Sequelize.STRING(64),
      allowNull: false,
    },
    create_time: Sequelize.DATE,
  },
  {
    timestamps: false,
    tableName: 'user',
  }
);

module.exports = Users;
