import getClanlist from './src/tasks/getClanlist'
import ClanRefresh from './src/tasks/clanRefresh'

export function clanlist(event, context, callback)  {
  getClanlist(event, context, callback)
};

export function refresh(event, context, callback) {
  const refresh = new ClanRefresh()

  refresh
    .run()
    .then(() => {
      callback(null)
    })
    .catch(e => {
      callback(true, e)
    })
}