'use strict';

angular.module('habitrpg')
.factory('Quests', ['$http', '$state','$q', 'ApiUrl', 'Content', 'Groups', 'User', 'Analytics',
  function questsFactory($http, $state, $q, ApiUrl, Content, Groups, User, Analytics) {

    var user = User.user;
    var party;

    Groups.party()
      .then(function (partyFound) {
        party = partyFound;
      });

    function lockQuest(quest,ignoreLevel) {
      return quest.locked;
    }

    function _preventQuestModal(quest) {
      if (!quest) {
        return 'No quest with that key found';
      }

      if (quest.previous && (!user.achievements.quests || (user.achievements.quests && !user.achievements.quests[quest.previous]))){
        alert(window.env.t('unlockByQuesting', {title: Content.quests[quest.previous].text()}));
        return 'unlockByQuesting';
      }

      if (quest.lvl > user.stats.lvl) {
        alert(window.env.t('mustLvlQuest', {level: quest.lvl}))
        return 'mustLvlQuest';
      }

      if (quest.unlockCondition && quest.unlockCondition.condition === 'create account') {

      }
    }

    function buyQuest(quest) {
      return $q(function(resolve, reject) {
        var item = Content.quests[quest];

        var preventQuestModal = _preventQuestModal(item);
        if (preventQuestModal) {
          return reject(preventQuestModal);
        }

        if (item.unlockCondition && item.unlockCondition.condition === 'party invite') {
          if (!confirm(window.env.t('mustInviteFriend'))) return reject('Did not want to invite friends');
          Groups.inviteOrStartParty(party)
          return reject('Invite or start party');
        }

        if (item.unlockCondition && item.unlockCondition.condition === 'create account') {
          alert(window.env.t('createAccountQuest'));
          return reject('Awarded to new accounts');
        }

        if (item.unlockCondition && item.unlockCondition.condition === 'login incentive') {
          if (user.loginIncentives > item.unlockCondition.incentiveThreshold) {
            alert(window.env.t('loginIncentiveQuestObtained', {count: item.unlockCondition.incentiveThreshold}));
          } else {
            alert(window.env.t('loginIncentiveQuest', {count: item.unlockCondition.incentiveThreshold}));
          }
          return reject('Login incentive item');
        }

        resolve(item);
      });
    }

    function questPopover(quest) {
      // The popover gets parsed as markdown (hence the double \n for line breaks
      var text = '';
      if(quest.boss) {
        text += '**' + window.env.t('bossHP') + ':** ' + quest.boss.hp + '\n\n';
        text += '**' + window.env.t('bossStrength') + ':** ' + quest.boss.str + '\n\n';
      } else if(quest.collect) {
        var count = 0;
        for (var key in quest.collect) {
          text += '**' + window.env.t('collect') + ':** ' + quest.collect[key].count + ' ' + quest.collect[key].text() + '\n\n';
        }
      }
      text += '---\n\n';
      text += '**' + window.env.t('rewards') + ':**\n\n';
      if(quest.drop.items) {
        for (var item in quest.drop.items) {
          text += quest.drop.items[item].text() + '\n\n';
        }
      }
      if(quest.drop.exp)
        text += quest.drop.exp + ' ' + window.env.t('experience') + '\n\n';
      if(quest.drop.gp)
        text += quest.drop.gp + ' ' + window.env.t('gold') + '\n\n';

      return text;
    }

    function showQuest(quest) {
      return $q(function(resolve, reject) {
        var item =  Content.quests[quest];

        var preventQuestModal = _preventQuestModal(item);
        if (preventQuestModal) {
          return reject(preventQuestModal);
        }

        resolve(item);
      });
    }

    function initQuest(key) {
      return $q(function(resolve, reject) {
        Analytics.updateUser({'partyID': party._id, 'partySize': party.memberCount});
        Groups.Group.inviteToQuest(party._id, key)
          .then(function(response) {
            party.quest = response.data.data;
            Groups.data.party = party;
            $state.go('options.social.party');
            resolve();
          });
      });
    }

    function sendAction(action) {
      return $q(function(resolve, reject) {
        $http.post(ApiUrl.get() + '/api/v3/groups/' + party._id + '/' + action)
          .then(function(response) {
            User.sync();

            Analytics.updateUser({
              partyID: party._id,
              partySize: party.memberCount
            });

            var quest = response.data.quest;
            if (!quest) quest = response.data.data;
            resolve(quest);
          });;
      });
    }

    return {
      lockQuest: lockQuest,
      buyQuest: buyQuest,
      questPopover: questPopover,
      sendAction: sendAction,
      showQuest: showQuest,
      initQuest: initQuest
    }
  }]);
