'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {

    await queryInterface.createTable('hoaxes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      content:{
        type:Sequelize.STRING,
      },
      timestamp:{
        type:Sequelize.BIGINT,
      }
    
    })
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
