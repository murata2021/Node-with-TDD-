'use strict';

const bcrypt=require('bcrypt')



module.exports = {
  async up (queryInterface, Sequelize) {
    const hashedPwd = await bcrypt.hash('P4ssword', 12);
    const users=[];
    for (let i = 0; i < 25; i++) {
      await users.push({
        username: `user${i + 1}`,
        email: `user${i + 1}@mail.com`,
        password:hashedPwd,
        inactive: false,
        createdAt:new Date(),
        updatedAt:new Date(),
      });
    }

    await queryInterface.bulkInsert('users',users,{})


    /**
     * 
     * 
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
  },

  async down (queryInterface, Sequelize) {

    await queryInterface.bulkDelete('users',null,{})
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
