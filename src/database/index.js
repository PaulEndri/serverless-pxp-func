import Sequelize from 'sequelize'
import MySql from 'mysql2'

const connectionBuilder = () => {
    const hostname = process.env.HOSTNAME
    const database = process.env.DATABASE
    const username = process.env.USERNAME
    const password = process.env.PASSWORD
    
   return new Sequelize(database, username, password, {
        host    : hostname,
        logging : false,
        dialect : "mysql",
        pool    : {
            max:     10,
            min:     0,
            acquire: 1000000,
            idle:    10000,
            timeout: 10000000
        },
        define : {
            paranoid:        false,
            timestamps:      true,
            freezeTableName: true,
            underscored:     true
          }
    })
}

export default connectionBuilder