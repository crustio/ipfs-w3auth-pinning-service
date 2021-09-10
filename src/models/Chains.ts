import {sequelize} from '../db/db';
import * as Sequelize from 'sequelize';

const Chains = sequelize.define(
  'chain',
  {
    id: {
      type: Sequelize.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    chain_name: {
      type: Sequelize.STRING(32),
      allowNull: false,
    },
    chain_type: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    create_time: Sequelize.DATE,
    update_time: Sequelize.DATE,
  },
  {
    timestamps: false,
    tableName: 'chain',
  }
);

module.exports = Chains;
