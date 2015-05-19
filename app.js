var app = angular.module('YouTubeAlarm', []);

// Run

app.run(function () {
  var tag = document.createElement('script');
  tag.src = "http://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
});

// Config

app.config( function ($httpProvider) {
  delete $httpProvider.defaults.headers.common['X-Requested-With'];
});

// Service

app.service('VideosService', ['$window', '$rootScope', '$log', function ($window, $rootScope, $log) {

  var service = this;

  var youtube = {
    ready: false,
    player: null,
    playerId: null,
    videoId: null,
    videoTitle: null,
    playerHeight: '480',
    playerWidth: '640',
    state: 'stopped'
  };
  var results = [];
  var upcoming = [
    // {id: 'kRJuY6ZDLPo', title: 'La Roux - In for the Kill (Twelves Remix)'},
    // {id: '45YSGFctLws', title: 'Shout Out Louds - Illusions'},
    // {id: 'ktoaj1IpTbw', title: 'CHVRCHES - Gun'},
    // {id: '8Zh0tY2NfLs', title: 'N.E.R.D. ft. Nelly Furtado - Hot N\' Fun (Boys Noize Remix) HQ'},
    // {id: 'zwJPcRtbzDk', title: 'Daft Punk - Human After All (SebastiAn Remix)'},
    // {id: 'sEwM6ERq0gc', title: 'HAIM - Forever (Official Music Video)'},
    // {id: 'fTK4XTvZWmk', title: 'Housse De Racket â˜â˜€â˜ Apocalypso'}
  ];
  var history = [
    // {id: 'XKa7Ywiv734', title: '[OFFICIAL HD] Daft Punk - Give Life Back To Music (feat. Nile Rodgers)'}
  ];

  $window.onYouTubeIframeAPIReady = function () {
    $log.info('Youtube API is ready');
    youtube.ready = true;
    service.bindPlayer('placeholder');
    service.loadPlayer();
    $rootScope.$apply();
  };

  function onYoutubeReady (event) {
    $log.info('YouTube Player is ready');
    try{
      youtube.player.cueVideoById(history[0].id);
      youtube.videoId = history[0].id;
      youtube.videoTitle = history[0].title;
    } catch(e){

    }
  }

  function onYoutubeStateChange (event) {
    if (event.data == YT.PlayerState.PLAYING) {
      youtube.state = 'playing';
    } else if (event.data == YT.PlayerState.PAUSED) {
      youtube.state = 'paused';
    } else if (event.data == YT.PlayerState.ENDED) {
      youtube.state = 'ended';
      service.launchPlayer(upcoming[0].id, upcoming[0].title);
      service.archiveVideo(upcoming[0].id, upcoming[0].title);
      service.deleteVideo(upcoming, upcoming[0].id);
    }
    $rootScope.$apply();
  }

  this.bindPlayer = function (elementId) {
    $log.info('Binding to ' + elementId);
    youtube.playerId = elementId;
  };

  this.createPlayer = function () {
    $log.info('Creating a new Youtube player for DOM id ' + youtube.playerId + ' and video ' + youtube.videoId);
    return new YT.Player(youtube.playerId, {
      height: youtube.playerHeight,
      width: youtube.playerWidth,
      playerVars: {
        rel: 0,
        showinfo: 0
      },
      events: {
        'onReady': onYoutubeReady,
        'onStateChange': onYoutubeStateChange
      }
    });
  };

  this.loadPlayer = function () {
    if (youtube.ready && youtube.playerId) {
      if (youtube.player) {
        youtube.player.destroy();
      }
      youtube.player = service.createPlayer();
    }
  };

  this.launchPlayer = function (id, title) {
    youtube.player.loadVideoById(id);
    youtube.videoId = id;
    youtube.videoTitle = title;
    return youtube;
  }
  this.playNext = function(){
    service.launchPlayer(upcoming[0].id, upcoming[0].title);
  }
  this.playNow = function(){
    youtube.player.playVideo();
  }
  this.listResults = function (data) {
    results.length = 0;
    for (var i = data.items.length - 1; i >= 0; i--) {
      results.push({
        id: data.items[i].id.videoId,
        title: data.items[i].snippet.title,
        description: data.items[i].snippet.description,
        thumbnail: data.items[i].snippet.thumbnails.default.url,
        author: data.items[i].snippet.channelTitle
      });
    }
    return results;
  }

  this.queueVideo = function (id, title) {
    upcoming.push({
      id: id,
      title: title
    });
    return upcoming;
  };

  this.archiveVideo = function (id, title) {
    history.unshift({
      id: id,
      title: title
    });
    return history;
  };

  this.deleteVideo = function (list, id) {
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].id === id) {
        list.splice(i, 1);
        break;
      }
    }
  };

  this.getYoutube = function () {
    return youtube;
  };

  this.getResults = function () {
    return results;
  };

  this.getUpcoming = function () {
    return upcoming;
  };

  this.getHistory = function () {
    return history;
  };

}]);

// Controller

app.controller('VideosController', function ($scope, $http, $log, VideosService, $timeout) {

    init();

    function init() {
      $scope.youtube = VideosService.getYoutube();
      $scope.results = VideosService.getResults();
      $scope.upcoming = VideosService.getUpcoming();
      $scope.history = VideosService.getHistory();
      $scope.playlist = true;
    }

    $scope.launch = function (id, title) {
      VideosService.launchPlayer(id, title);
      VideosService.archiveVideo(id, title);
      VideosService.deleteVideo($scope.upcoming, id);
      $log.info('Launched id:' + id + ' and title:' + title);
    };

    $scope.queue = function (id, title) {
      VideosService.queueVideo(id, title);
      VideosService.deleteVideo($scope.history, id);
      $log.info('Queued id:' + id + ' and title:' + title);
    };

    $scope.alarmVideo = {id:0,title:''};
    $scope.setAlarm = function(id,title){
      $scope.alarmVideo = {id:id,title:title};
      $scope.launch($scope.alarmVideo.id,$scope.alarmVideo.title);
    }

    $scope.delete = function (list, id) {
      VideosService.deleteVideo(list, id);
    };
    $scope.searched = 0;
    $scope.search = function () {
      $scope.searched++;
      $http.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: 'AIzaSyBovJr5nTkFM-Njwa4Avbg8h0snO0ioFXY',
          type: 'video',
          maxResults: '8',
          part: 'id,snippet',
          fields: 'items/id,items/snippet/title,items/snippet/description,items/snippet/thumbnails/default,items/snippet/channelTitle',
          q: this.query
        }
      })
      .success( function (data) {
        VideosService.listResults(data);
        $log.info(data);
      })
      .error( function () {
        $log.info('Search error');
      });
    }

    $scope.tabulate = function (state) {
      $scope.playlist = state;
    }

    $scope.nowTime = '';
    $scope.alarm = '09:00:00';
    function startTime()
      {
        var today=new Date();
        var h=today.getHours();
        var m=today.getMinutes();
        var s=today.getSeconds();
        // add a zero in front of numbers<10
        h=checkTime(h);
        m=checkTime(m);
        s=checkTime(s);
        $scope.nowTime =h+":"+m+":"+s;
        t=$timeout(startTime,500);
        
        var timeAlarm = $scope.alarm;
        if(timeAlarm == h+":"+m+":"+s){
          //$scope.launch($scope.alarmVideo.id,$scope.alarmVideo.title);
          VideosService.playNow();
        }
      }
      
      function checkTime(i)
      {
        if (i<10) { i="0" + i; } 
        return i;
      }

      startTime();

      $(document).ready(function () {
        $("#alarm>input").mask("99:99:99",{completed:function(inpt){
          $scope.alarm = $("#alarm>input").val();
          $scope.$apply();
        }});
      });
});