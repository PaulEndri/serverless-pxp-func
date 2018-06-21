import SqlizeConnection from './src/database'
import BungieClan from './src/database/models/bungieClan'


export function clanlist(event, context, callback)  {
  const connection = SqlizeConnection()
  const BungieClanModel = BungieClan(connection)

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true
    },
    body: ''
  }

  BungieClanModel.findAll({
    attributes: ['name', 'group_id', 'member_count', 'platform'],
    raw: true
  })
    .then((data) => {
      response.body = JSON.stringify(data)

      callback(null, response)

      connection.close()
    }).catch((e) => {
      response.body = JSON.stringify(e)
      response.statusCode = 500

      callback(null, response)

      connection.close()
    })
};