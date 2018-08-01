import _BungieClan from '../database/models/bungieClan';
import _BungieMembership from '../database/models/bungieMembership';
import _BungieMember from '../database/models/bungieMember';
import BungieSDK from 'bungie-sdk-alpha';
import SqlizeConnection from '../database'

export default class ClanRefresh {
    constructor(db) {
        this.db  = SqlizeConnection();
    }

    async getClan() {
        const BungieClan = _BungieClan(this.db);
        let queryObject  = {
            order : [['synced_at', 'ASC']],
            limit : 1
        };

        return await BungieClan.find(queryObject);
    }

    refreshMember(membership, memberData) {
        const BungieMember = _BungieMember(this.db);
        
        let query = {
            where : {destiny_id : membership.destiny_member_id}
        };

        let contents     = {
            deleted:        false,
            name:           memberData.userInfo.displayName,
            last_seen:      memberData.dateLastPlayed,
            type:           membership.membership_type,
            bungie_id:      membership.bungie_member_id,
            destiny_id:     membership.destiny_member_id,
            active_clan_id: membership.clan_id,
            type:           membership.membership_type,
            data:           JSON.stringify({
                profile: memberData
            })
        };

        return new Promise((resolve, reject) => {
            BungieMember
                .findOrCreate(query)
                .spread((member, created) => {
                    if(!membership.member_id) {
                        membership.member_id = member.id;
                        membership.save();
                    }

                    member
                        .update(contents)
                        .then(_member => {
                            resolve(_member);
                        })
                })
        })
    }

    async refreshMemberData(member, clan) {
        try {
            let membership  = await this.refreshMembership(member, clan);
            
            try {            
                let destinyInfo = member.destinyUserInfo;        
                let profile     = await BungieSDK.DestinyProfile.getProfile(destinyInfo.membershipType, [100], destinyInfo.membershipId);
                let memberData  = await this.refreshMember(membership, profile.profile.data);
            }
            catch(e) {
                console.log("[ERROR]");
                console.log(e);
            }
        }
        catch(e) {
            console.log("[ERROR]");
            console.log(e);
        }

        return true;
    }

    refreshMembership(member, clan) {
        const BungieMembership = _BungieMembership(this.db);
        let destinyInfo        = member.destinyUserInfo;

        let query = {
            where : {destiny_member_id : destinyInfo.membershipId}
        };

        let contents = {
            clan_id:           clan.id,
            bungie_clan_id:    clan.group_id,
            membership_type:   destinyInfo.membershipType,
            destiny_member_id: destinyInfo.membershipId,
            deleted:           0
        }

        if(destinyInfo.bungieNetUserInfo !== undefined) {
            contents.bungie_member_id = destinyInfo.bungieNetUserInfo.membershipId
        };
        
        return new Promise((resolve, reject) => {
            BungieMembership
                .findOrCreate(query)
                .spread((member, created) => {
                    member
                        .update(contents)
                        .then(_member => {
                            resolve(_member);
                        });
                })
        });
    }

    run() {
        return new Promise(async (resolve, reject) => {
            let clan  = await this.getClan();

            console.log(`Refreshing next clan in queue: ${clan.name}`);

            let group = await new BungieSDK.Group(clan.group_id);
            let updates = {
                data:         JSON.stringify(group.clean()),
                name:         group.detail.name,
                member_count: group.detail.memberCount,
                synced_at:    new Date()
            };
    
            clan
                .update(updates)
                .then(async _clan => {
                    await this.db.query(`update bungie_membership set deleted = 1 where bungie_clan_id = ${clan.group_id}`);
                    await this.db.query(`update bungie_member set active_clan_id = NULL where active_clan_id = ${clan.group_id}`);
                    
                    let members = await group.getMembers();                
                    let updates = members.members.map(member => this.refreshMemberData(member, clan));
    
                    Promise
                        .all(updates)
                        .then(() => {
                            console.log("Refresh succesfully completed");

                            resolve();
                        })
                        .catch(e => {
                            console.log(e);
                            console.log("An error has occured.");

                            reject();
                        });
                });    
        })
    }
}