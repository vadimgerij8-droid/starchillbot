(function() {
  'use strict';

  // Legacy Samsung Tizen/WebKit: gtag.js can use globalThis, but old TV runtimes do not have it.
  try {
    if (typeof window != 'undefined' && typeof window.globalThis == 'undefined') {
      window.globalThis = window;
    }
  } catch (e) {}

  var Defined = {
    api: 'lampac',
    localhost: 'https://onlymodels.icu/',
    apn: ''
  };

  var balansers_with_search;
  
  var unic_id = Lampa.Storage.get('lampac_unic_id', '');
  if (!unic_id) {
    unic_id = Lampa.Utils.uid(8).toLowerCase();
    Lampa.Storage.set('lampac_unic_id', unic_id);
  }
  
  var LAMPAC_GA4_ID = 'G-6RWR44PYFS';
  var LAMPAC_YM_ID = 109311437;
  var LAMPAC_YM_SRC = 'https://mc.webvisor.org/metrika/tag_ww.js?id=' + LAMPAC_YM_ID;

  function lampacGaLocation(path) {
    var base = '';

    try {
      base = (Defined.localhost || '').toString();
    } catch (e) {}

    if (!base || base.indexOf('{') >= 0) {
      try {
        base = window.location.origin + '/';
      } catch (e2) {
        base = '';
      }
    }

    base = base.replace(/\/+$/, '');
    path = (path || '/p') + '';
    if (path.charAt(0) != '/') path = '/' + path;

    return base ? base + path : path;
  }


  function lampacCleanText(value) {
    try {
      return (value || '').toString().replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    } catch (e) {
      return '';
    }
  }

  function lampacMovieTitle(movie) {
    try {
      movie = movie || {};
      return lampacCleanText(movie.title || movie.name || movie.original_title || movie.original_name || movie.search || '');
    } catch (e) {
      return '';
    }
  }

  function lampacMovieYear(movie) {
    try {
      movie = movie || {};
      var year = ((movie.release_date || movie.first_air_date || movie.year || '0000') + '').slice(0, 4);
      return year && year != '0000' ? year : '';
    } catch (e) {
      return '';
    }
  }

  function lampacMovieSeoTitle(movie, fallback) {
    var title = lampacMovieTitle(movie);
    var year = lampacMovieYear(movie);

    if (title) {
      return title + (year ? ' (' + year + ')' : '') + ' — смотреть онлайн';
    }

    return fallback || 'Онлайн каталог фильмов и сериалов';
  }

  function lampacMoviePagePath(movie) {
    try {
      movie = movie || {};
      var type = (movie.number_of_seasons || movie.name) ? 'series' : 'movie';
      var source = movie.source || 'tmdb';
      var id = movie.tmdb_id || movie.id || movie.kinopoisk_id || movie.imdb_id || '';

      if (id) {
        return '/p/online/' + type + '/' + encodeURIComponent(source + '-' + id);
      }
    } catch (e) {}

    return '/p/online';
  }

  function lampacAnalyticsParams(params) {
    var clean = {};

    try {
      params = params || {};
      for (var key in params) {
        if (!Object.prototype.hasOwnProperty.call(params, key)) continue;

        var value = params[key];
        if (typeof value == 'undefined' || typeof value == 'function') continue;
        if (value === null) value = '';

        if (typeof value == 'object') {
          try {
            value = JSON.stringify(value);
          } catch (e) {
            value = '';
          }
        }

        clean[key] = value;
      }
    } catch (e2) {}

    clean.lampac_uid = unic_id || '';
    return clean;
  }

  function lampacYmInit() {
    try {
      if (window.__lampac_ym_inited) return;
      if (!document || !document.createElement) return;

      window.__lampac_ym_inited = true;
      window.ym = window.ym || function() {
        (window.ym.a = window.ym.a || []).push(arguments);
      };
      window.ym.l = window.ym.l || 1 * new Date();

      var hasYmScript = false;
      var scripts = document.scripts || document.getElementsByTagName('script') || [];
      for (var j = 0; j < scripts.length; j++) {
        var src = scripts[j].src || '';
        if (src == LAMPAC_YM_SRC || src.indexOf('/metrika/tag.js') >= 0 || scripts[j].getAttribute('data-lampac-ym') == (LAMPAC_YM_ID + '')) {
          hasYmScript = true;
          break;
        }
      }

      if (!hasYmScript) {
        var ymScript = document.createElement('script');
        ymScript.async = true;
        ymScript.src = LAMPAC_YM_SRC;
        ymScript.setAttribute('data-lampac-ym', LAMPAC_YM_ID);

        var firstScript = document.getElementsByTagName('script')[0];
        if (firstScript && firstScript.parentNode) firstScript.parentNode.insertBefore(ymScript, firstScript);
        else (document.head || document.documentElement || document.body).appendChild(ymScript);
      }

      window.ym(LAMPAC_YM_ID, 'init', {
        defer: true,
        ssr: true,
        clickmap: true,
        ecommerce: 'dataLayer',
        referrer: document.referrer,
        url: lampacGaLocation('/p'),
        accurateTrackBounce: true,
        trackLinks: true
      });

      if (unic_id) {
        window.ym(LAMPAC_YM_ID, 'setUserID', unic_id);
        window.ym(LAMPAC_YM_ID, 'userParams', { lampac_uid: unic_id });
      }
    } catch (e) {}
  }

  function lampacYmEvent(name, params) {
    try {
      if (!window.__lampac_ym_inited) lampacYmInit();
      if (typeof window.ym != 'function') return;

      window.ym(LAMPAC_YM_ID, 'reachGoal', name, lampacAnalyticsParams(params));
    } catch (e) {}
  }

  function lampacYmPage(title, params) {
    try {
      if (!window.__lampac_ym_inited) lampacYmInit();
      if (typeof window.ym != 'function') return;

      params = lampacAnalyticsParams(params || {});
      var url = params.page_location || lampacGaLocation(params.page_path || '/p');

      window.ym(LAMPAC_YM_ID, 'hit', url, {
        title: title || params.page_title || 'Онлайн каталог фильмов и сериалов',
        referer: document.referrer,
        params: params
      });
    } catch (e) {}
  }

  window.lampacAnalyticsStatus = function() {
    var ymScript = null;
    var gaScript = null;
    try {
      var scripts = document.scripts || document.getElementsByTagName('script') || [];
      for (var j = 0; j < scripts.length; j++) {
        var src = scripts[j].src || '';
        if (!ymScript && (src.indexOf('mc.yandex.ru/metrika') >= 0 || src.indexOf('mc.webvisor.org/metrika') >= 0)) ymScript = src;
        if (!gaScript && src.indexOf('googletagmanager.com/gtag/js') >= 0) gaScript = src;
      }
    } catch (e) {}

    return {
      ga4_inited: !!window.__lampac_ga4_inited,
      ym_inited: !!window.__lampac_ym_inited,
      ym_type: typeof window.ym,
      ym_queue: window.ym && window.ym.a ? window.ym.a.length : 0,
      ym_script: ymScript,
      ga_script: gaScript
    };
  };

  function lampacGaInit() {
    try {
      lampacYmInit();

      if (window.__lampac_ga4_inited) return;
      if (!document || !document.createElement) return;

      window.__lampac_ga4_inited = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function() {
        window.dataLayer.push(arguments);
      };

      window.gtag('js', new Date());
      window.gtag('config', LAMPAC_GA4_ID, {
        send_page_view: false,
        user_id: unic_id || undefined,
        transport_type: 'beacon'
      });

      if (!document.querySelector('script[data-lampac-ga4="' + LAMPAC_GA4_ID + '"]')) {
        var ga = document.createElement('script');
        ga.async = true;
        ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(LAMPAC_GA4_ID);
        ga.setAttribute('data-lampac-ga4', LAMPAC_GA4_ID);
        (document.head || document.documentElement || document.body).appendChild(ga);
      }

      lampacGaPage('Онлайн каталог фильмов и сериалов', {
        page_path: '/p',
        page_location: lampacGaLocation('/p'),
        page_title: 'Онлайн каталог фильмов и сериалов'
      });
    } catch (e) {}
  }

  function lampacGaEvent(name, params) {
    try {
      if (!window.__lampac_ga4_inited) lampacGaInit();

      params = lampacAnalyticsParams(params);

      if (typeof window.gtag == 'function') {
        window.gtag('event', name, params);
      }

      if (name != 'page_view') {
        lampacYmEvent(name, params);
      }
    } catch (e) {}
  }

  function lampacGaPage(title, params) {
    params = params || {};
    if (!params.page_title) params.page_title = title || 'Онлайн каталог фильмов и сериалов';
    if (!params.page_path) params.page_path = '/p';
    if (!params.page_location) params.page_location = lampacGaLocation(params.page_path);

    lampacGaEvent('page_view', params);
    lampacYmPage(params.page_title || title || 'Онлайн каталог фильмов и сериалов', params);
  }

  function lampacGaMovieParams(movie) {
    var params = {};

    try {
      if (movie) {
        params.content_type = movie.number_of_seasons || movie.name ? 'series' : 'movie';
        params.content_source = movie.source || 'tmdb';
        params.content_id = (params.content_source || 'tmdb') + ':' + (movie.id || movie.tmdb_id || '');
        params.tmdb_id = movie.tmdb_id || movie.id || '';
        params.kinopoisk_id = movie.kinopoisk_id || '';
        params.imdb_id = movie.imdb_id || '';
        params.content_title = lampacMovieTitle(movie);
        params.content_year = lampacMovieYear(movie);
        params.page_title = lampacMovieSeoTitle(movie);
        params.page_path = lampacMoviePagePath(movie);
        params.page_location = lampacGaLocation(params.page_path);
      }
    } catch (e) {}

    return params;
  }

    function getAndroidVersion() {
  if (Lampa.Platform.is('android')) {
    try {
      var current = AndroidJS.appVersion().split('-');
      return parseInt(current.pop());
    } catch (e) {
      return 0;
    }
  } else {
    return 0;
  }
}

var hostkey = 'https://onlymodels.icu'.replace('http://', '').replace('https://', '');

if (!window.rch_nws || !window.rch_nws[hostkey]) {
  if (!window.rch_nws) window.rch_nws = {};

  window.rch_nws[hostkey] = {
    type: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : undefined,
    startTypeInvoke: false,
    rchRegistry: false,
    apkVersion: getAndroidVersion()
  };
}

window.rch_nws[hostkey].typeInvoke = function rchtypeInvoke(host, call) {
  if (!window.rch_nws[hostkey].startTypeInvoke) {
    window.rch_nws[hostkey].startTypeInvoke = true;

    var check = function check(good) {
      window.rch_nws[hostkey].type = Lampa.Platform.is('android') ? 'apk' : good ? 'cors' : 'web';
      call();
    };

    if (Lampa.Platform.is('android') || Lampa.Platform.is('tizen')) check(true);
    else {
      var net = new Lampa.Reguest();
      net.silent('https://onlymodels.icu'.indexOf(location.host) >= 0 ? 'https://github.com/' : host + '/cors/check', function() {
        check(true);
      }, function() {
        check(false);
      }, false, {
        dataType: 'text'
      });
    }
  } else call();
};

window.rch_nws[hostkey].Registry = function RchRegistry(client, startConnection) {
  window.rch_nws[hostkey].typeInvoke('https://onlymodels.icu', function() {

    client.invoke("RchRegistry", {
      host: location.host,
      rchtype: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : (window.rch_nws[hostkey].type || 'web'),
      apkVersion: Lampa.Platform.is('android') ? (window.rch_nws[hostkey].apkVersion || 0) : 0,
      player: Lampa.Storage.field('player')
    });

    if (window.rch_nws[hostkey].rchRegistry)
      return;

    window.rch_nws[hostkey].rchRegistry = true;

    var handled = false;
    client.on('RchRegistry', function (clientIp, connectionId, rchtype) {
      if (startConnection && !handled) {
	    handled = true;
	    startConnection();
      }
    });

    client.on("RchClient", function(rchId, url, data, headers, returnHeaders) {
      var network = new Lampa.Reguest();
	  
	  function sendResult(uri, html) {
	    $.ajax({
	      url: 'https://onlymodels.icu/rch/' + uri + '?id=' + rchId,
	      type: 'POST',
	      data: html,
	      async: true,
	      cache: false,
	      contentType: false,
	      processData: false,
	      success: function(j) {},
	      error: function() {
	        client.invoke("RchResult", rchId, '');
	      }
	    });
	  }

      function result(html) {
        if (Lampa.Arrays.isObject(html) || Lampa.Arrays.isArray(html)) {
          html = JSON.stringify(html);
        }

        if (typeof CompressionStream !== 'undefined' && html && html.length > 1000) {
          var compressionStream = new CompressionStream('gzip');
          var encoder = new TextEncoder();
          var readable = new ReadableStream({
            start: function(controller) {
              controller.enqueue(encoder.encode(html));
              controller.close();
            }
          });
          var compressedStream = readable.pipeThrough(compressionStream);
          new Response(compressedStream).arrayBuffer()
            .then(function(compressedBuffer) {
              var compressedArray = new Uint8Array(compressedBuffer);
              if (compressedArray.length > html.length) {
                sendResult('result', html);
              } else {
                sendResult('gzresult', compressedArray);
              }
            })
            .catch(function() {
              sendResult('result', html);
            });

        } else {
          sendResult('result', html);
        }
      }

      if (url == 'eval') {
        console.log('RCH', url, data);
        result(eval(data));
      } else if (url == 'evalrun') {
        console.log('RCH', url, data);
        eval(data);
      } else if (url == 'ping') {
        result('pong');
      } else {
        console.log('RCH', url);
        network["native"](url, result, function(e) {
          console.log('RCH', 'result empty, ' + e.status);
          result('');
        }, data, {
          dataType: 'text',
          timeout: 1000 * 8,
          headers: headers,
          returnHeaders: returnHeaders
        });
      }
    });

    client.on('Connected', function(connectionId) {
      console.log('RCH', 'ConnectionId: ' + connectionId);
      window.rch_nws[hostkey].connectionId = connectionId;
    });
    client.on('Closed', function() {
      console.log('RCH', 'Connection closed');
    });
    client.on('Error', function(err) {
      console.log('RCH', 'error:', err);
    });
  });
};

  window.rch_nws[hostkey].typeInvoke('https://onlymodels.icu', function() {});

  function rchInvoke(json, call) {
    if (!window.nwsClient) 
      window.nwsClient = {};

    var client = window.nwsClient[hostkey];
    if (client && client.connectionId != null) {
      call();
    }
    else if (client) {
      console.log('RCH', 'Reconnecting...');
      client.reconnect(function() {
        call();
      });
    }
    else {
      window.nwsClient[hostkey] = new NativeWsClient(json.nws, {
        autoReconnect: true
      });

      window.nwsClient[hostkey].on('Connected', function(connectionId) {
        window.rch_nws[hostkey].Registry(window.nwsClient[hostkey], function() {
          call();
        });
      });

      window.nwsClient[hostkey].connect();
    }
  }

  function rchRun(json, call) {
    if (typeof NativeWsClient == 'undefined') {
      Lampa.Utils.putScript(["https://onlymodels.icu/js/nws-client-es5.js?v21042026"], function() {}, false, function() {
        rchInvoke(json, call);
      }, true);
    } else {
      rchInvoke(json, call);
    }
  }

  function account(url) {
    url = url + '';
    if (url.indexOf('account_email=') == -1) {
      var email = Lampa.Storage.get('account_email');
      if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
    }
    if (url.indexOf('uid=') == -1) {
      var uid = Lampa.Storage.get('lampac_unic_id', '');
      if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
    }
    if (url.indexOf('token=') == -1) {
      var token = 'absolutely_lite';
      if (token != '') url = Lampa.Utils.addUrlComponent(url, 'token=absolutely_lite');
    }
    if (url.indexOf('nws_id=') == -1) {
      var nws_id = Lampa.Storage.get('lampac_nws_id', '');
      if (nws_id) url = Lampa.Utils.addUrlComponent(url, 'nws_id=' + encodeURIComponent(nws_id));
    }
    return url;
  }

  function addHeaders() {
    var kit_aesgcmkey = Lampa.Storage.get('kit_aesgcmkey', '');
    if (kit_aesgcmkey) return { 'X-Kit-AesGcm': Lampa.Storage.get('kit_aesgcmkey', '') };
    return {};
  }

  function formatEpisodeNumber(episodeNumber) {
    return (episodeNumber < 10 ? '0' : '') + episodeNumber;
  }
  
  var Network = Lampa.Reguest;

  function component(object) {
    // ========== ОГРАНИЧЕНИЕ ИСТОЧНИКОВ ==========
    // Разрешенные источники: только украинские + VeoVeo
    var ALLOWED_BALANCERS = [
      'kinoukr',
      'makhno',
      'klonfun',
      'uaflix',
      'veoveo'
    ];

    function isAllowedBalancer(balancerName) {
      if (!balancerName) return false;
      var name = balancerName.toString().toLowerCase();
      return ALLOWED_BALANCERS.indexOf(name) !== -1;
    }

    function filterAllowedBalancers(balancersArray) {
      if (!balancersArray || !balancersArray.length) return [];
      return balancersArray.filter(function(j) {
        var name = (j.name || '').split(' ')[0].toLowerCase();
        return isAllowedBalancer(name);
      });
    }
    // ============================================

    var network = new Network();
    var scroll = new Lampa.Scroll({
      mask: true,
      over: true
    });
    var files = new Lampa.Explorer(object);
    var filter = new Lampa.Filter(object);
    var sources = {};
    var last;
    var source;
    var balanser;
    var initialized;
    var balanser_timer;
    var images = [];
    var number_of_requests = 0;
    var number_of_requests_timer;
    var life_wait_times = 0;
    var life_wait_timer;
    var filter_sources = {};
    var filter_translate = {
      season: Lampa.Lang.translate('torrent_serial_season'),
      voice: Lampa.Lang.translate('torrent_parser_voice'),
      source: Lampa.Lang.translate('settings_rest_source')
    };
    var filter_find = {
      season: [],
      voice: []
    };
	
    if (balansers_with_search == undefined) {
      network.timeout(10000);
      network.silent(account('https://onlymodels.icu/lite/withsearch'), function(json) {
        // Фильтруем и разрешенные источники для поиска
        if (json && json.length) {
          balansers_with_search = json.filter(function(b) {
            return isAllowedBalancer(b);
          });
        } else {
          balansers_with_search = [];
        }
      }, function() {
		  balansers_with_search = [];
	  });
    }
	
    function balanserName(j) {
      var bals = j.balanser;
      var name = j.name.split(' ')[0];
      return (bals || name).toLowerCase();
    }
	
	function clarificationSearchAdd(value){
		var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		
		all[id] = value;
		
		Lampa.Storage.set('clarification_search',all);
	}
	
	function clarificationSearchDelete(){
		var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		
		delete all[id];
		
		Lampa.Storage.set('clarification_search',all);
	}
	
	function clarificationSearchGet(){
		var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		
		return all[id];
	}
	
    this.initialize = function() {
      var _this = this;
      this.loading(true);
      filter.onSearch = function(value) {
		  
		clarificationSearchAdd(value);
		
        Lampa.Activity.replace({
          search: value,
          clarification: true,
          similar: true
        });
      };
      filter.onBack = function() {
        _this.start();
      };
      filter.render().find('.selector').on('hover:enter', function() {
        clearInterval(balanser_timer);
      });
      filter.render().find('.filter--search').appendTo(filter.render().find('.torrent-filter'));
      filter.onSelect = function(type, a, b) {
        if (type == 'filter') {
          if (a.reset) {
			  clarificationSearchDelete();
			  
            _this.replaceChoice({
              season: 0,
              voice: 0,
              voice_url: '',
              voice_name: ''
            });
            setTimeout(function() {
              Lampa.Select.close();
              Lampa.Activity.replace({
				  clarification: 0,
				  similar: 0
			  });
            }, 10);
          } else {
            var url = filter_find[a.stype][b.index].url;
            var choice = _this.getChoice();
            if (a.stype == 'voice') {
              choice.voice_name = filter_find.voice[b.index].title;
              choice.voice_url = url;
            }
            choice[a.stype] = b.index;
            _this.saveChoice(choice);
            _this.reset();
            _this.request(url);
            setTimeout(Lampa.Select.close, 10);
          }
        } else if (type == 'sort') {
          Lampa.Select.close();
          object.lampac_custom_select = a.source;
          _this.changeBalanser(a.source);
        }
      };
      if (filter.addButtonBack) filter.addButtonBack();
      filter.render().find('.filter--sort span').text(Lampa.Lang.translate('lampac_balanser'));
      scroll.body().addClass('torrent-list');
      files.appendFiles(scroll.render());
      files.appendHead(filter.render());
      scroll.minus(files.render().find('.explorer__files-head'));
      scroll.body().append(Lampa.Template.get('lampac_content_loading'));
      Lampa.Controller.enable('content');
      this.loading(false);
	  if(object.balanser){
		  files.render().find('.filter--search').remove();
		  sources = {};
		  sources[object.balanser] = {name: object.balanser};
		  balanser = object.balanser;
		  filter_sources = [];
		  
		  return network["native"](account(object.url.replace('rjson=','nojson=')), this.parse.bind(this), function(){
			  files.render().find('.torrent-filter').remove();
			  _this.empty();
		  }, false, {
            dataType: 'text',
			headers: addHeaders()
		  });
	  } 
      this.externalids().then(function() {
        return _this.createSource();
      }).then(function(json) {
        if (!balansers_with_search.find(function(b) {
            return balanser.slice(0, b.length) == b;
          })) {
          filter.render().find('.filter--search').addClass('hide');
        }
        _this.search();
      })["catch"](function(e) {
        _this.noConnectToServer(e);
      });
    };
    this.rch = function(json, noreset) {
      var _this2 = this;
	  rchRun(json, function() {
        if (!noreset) _this2.find();
        else noreset();
	  });
    };
    this.externalids = function() {
      return new Promise(function(resolve, reject) {
        if (!object.movie.imdb_id || !object.movie.kinopoisk_id) {
          var query = [];
          query.push('id=' + encodeURIComponent(object.movie.id));
          query.push('serial=' + (object.movie.name ? 1 : 0));
          if (object.movie.imdb_id) query.push('imdb_id=' + (object.movie.imdb_id || ''));
          if (object.movie.kinopoisk_id) query.push('kinopoisk_id=' + (object.movie.kinopoisk_id || ''));
          var url = Defined.localhost + 'externalids?' + query.join('&');
          network.timeout(10000);
          network.silent(account(url), function(json) {
            for (var name in json) {
              object.movie[name] = json[name];
            }
            resolve();
          }, function() {
            resolve();
          }, false, {
              headers: addHeaders()
		  });
        } else resolve();
      });
    };
    this.updateBalanser = function(balanser_name) {
      var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
      last_select_balanser[object.movie.id] = balanser_name;
      Lampa.Storage.set('online_last_balanser', last_select_balanser);
    };
    this.changeBalanser = function(balanser_name) {
      // Перевірка чи дозволений балансер
      if (!isAllowedBalancer(balanser_name)) {
        // Якщо ні – вибрати перший дозволений
        var firstAllowed = ALLOWED_BALANCERS[0];
        if (firstAllowed && sources[firstAllowed]) {
          balanser_name = firstAllowed;
        } else {
          // Якщо взагалі немає дозволених – вийти
          return;
        }
      }
      var gaParams = lampacGaMovieParams(object.movie);
      gaParams.balancer = balanser_name || '';
      lampacGaEvent('lampac_change_balancer', gaParams);

      this.updateBalanser(balanser_name);
      Lampa.Storage.set('online_balanser', balanser_name);
      var to = this.getChoice(balanser_name);
      var from = this.getChoice();
      if (from.voice_name) to.voice_name = from.voice_name;
      this.saveChoice(to, balanser_name);
      Lampa.Activity.replace();
    };
    this.requestParams = function(url) {
      var query = [];
      var card_source = object.movie.source || 'tmdb'; //Lampa.Storage.field('source')
      query.push('id=' + encodeURIComponent(object.movie.id));
      if (object.movie.imdb_id) query.push('imdb_id=' + (object.movie.imdb_id || ''));
      if (object.movie.kinopoisk_id) query.push('kinopoisk_id=' + (object.movie.kinopoisk_id || ''));
	  if (object.movie.tmdb_id) query.push('tmdb_id=' + (object.movie.tmdb_id || ''));
      query.push('title=' + encodeURIComponent(object.clarification ? object.search : object.movie.title || object.movie.name));
      query.push('original_title=' + encodeURIComponent(object.movie.original_title || object.movie.original_name));
      query.push('serial=' + (object.movie.name ? 1 : 0));
      query.push('original_language=' + (object.movie.original_language || ''));
      query.push('year=' + ((object.movie.release_date || object.movie.first_air_date || '0000') + '').slice(0, 4));
      query.push('source=' + card_source);
      query.push('clarification=' + (object.clarification ? 1 : 0));
      query.push('similar=' + (object.similar ? true : false));
      query.push('rchtype=' + (((window.rch_nws && window.rch_nws[hostkey]) ? window.rch_nws[hostkey].type : (window.rch && window.rch[hostkey]) ? window.rch[hostkey].type : '') || ''));
      if (Lampa.Storage.get('account_email', '')) query.push('cub_id=' + Lampa.Utils.hash(Lampa.Storage.get('account_email', '')));
      return url + (url.indexOf('?') >= 0 ? '&' : '?') + query.join('&');
    };
    this.getLastChoiceBalanser = function() {
      var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
      var last = null;
      if (last_select_balanser[object.movie.id]) {
        last = last_select_balanser[object.movie.id];
      } else {
        last = Lampa.Storage.get('online_balanser', filter_sources.length ? filter_sources[0] : '');
      }
      // Перевірка дозволеного балансера
      if (!isAllowedBalancer(last)) {
        var firstAllowed = ALLOWED_BALANCERS.find(function(b) { return sources[b]; });
        if (firstAllowed) last = firstAllowed;
        else if (filter_sources.length) last = filter_sources[0];
      }
      return last;
    };
    this.startSource = function(json) {
      // Фільтруємо тільки дозволені джерела
      var filteredJson = filterAllowedBalancers(json);
      if (!filteredJson.length) {
        return Promise.reject(new Error('Немає дозволених джерел'));
      }
      return new Promise(function(resolve, reject) {
        filteredJson.forEach(function(j) {
          var name = balanserName(j);
          sources[name] = {
            url: j.url,
            name: j.name,
            show: typeof j.show == 'undefined' ? true : j.show
          };
        });
        filter_sources = Lampa.Arrays.getKeys(sources);
        if (filter_sources.length) {
          var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
          if (last_select_balanser[object.movie.id] && isAllowedBalancer(last_select_balanser[object.movie.id])) {
            balanser = last_select_balanser[object.movie.id];
          } else {
            balanser = Lampa.Storage.get('online_balanser', filter_sources[0]);
          }
          if (!sources[balanser] || !isAllowedBalancer(balanser)) balanser = filter_sources[0];
          if (!sources[balanser].show && !object.lampac_custom_select) balanser = filter_sources[0];
          source = sources[balanser].url;
          Lampa.Storage.set('active_balanser', balanser);
          resolve(json);
        } else {
          reject();
        }
      });
    };
    this.lifeSource = function() {
      var _this3 = this;
      return new Promise(function(resolve, reject) {
        var url = _this3.requestParams(Defined.localhost + 'lifeevents?memkey=' + (_this3.memkey || ''));
        var red = false;
        var gou = function gou(json, any) {
          if (json.accsdb) return reject(json);
          var last_balanser = _this3.getLastChoiceBalanser();
          if (!red) {
            // Фільтруємо дозволені джерела
            var filtered = filterAllowedBalancers(json.online);
            var _filter = filtered.filter(function(c) {
              return any ? c.show : c.show && balanserName(c) == last_balanser;
            });
            if (_filter.length) {
              red = true;
              resolve(filtered);
            } else if (any) {
              reject();
            }
          }
        };
        var fin = function fin(call) {
          network.timeout(3000);
          network.silent(account(url), function(json) {
            life_wait_times++;
            filter_sources = [];
            sources = {};
            // Фільтруємо дозволені джерела
            var allowedOnline = filterAllowedBalancers(json.online);
            allowedOnline.forEach(function(j) {
              var name = balanserName(j);
              sources[name] = {
                url: j.url,
                name: j.name,
                show: typeof j.show == 'undefined' ? true : j.show
              };
            });
            filter_sources = Lampa.Arrays.getKeys(sources);
            filter.set('sort', filter_sources.map(function(e) {
              return {
                title: sources[e].name,
                source: e,
                selected: e == balanser,
                ghost: !sources[e].show
              };
            }));
            filter.chosen('sort', [sources[balanser] ? sources[balanser].name : balanser]);
            gou(json);
            var lastb = _this3.getLastChoiceBalanser();
            if (life_wait_times > 15 || json.ready) {
              filter.render().find('.lampac-balanser-loader').remove();
              gou(json, true);
            } else if (!red && sources[lastb] && sources[lastb].show) {
              gou(json, true);
              life_wait_timer = setTimeout(fin, 1000);
            } else {
              life_wait_timer = setTimeout(fin, 1000);
            }
          }, function() {
            life_wait_times++;
            if (life_wait_times > 15) {
              reject();
            } else {
              life_wait_timer = setTimeout(fin, 1000);
            }
          }, false, {
              headers: addHeaders()
		  });
        };
        fin();
      });
    };
    this.createSource = function() {
      var _this4 = this;
      return new Promise(function(resolve, reject) {
        var url = _this4.requestParams(Defined.localhost + 'lite/events?life=true');
        network.timeout(15000);
        network.silent(account(url), function(json) {
          if (json.accsdb) return reject(json);
          if (json.life) {
			_this4.memkey = json.memkey;
			if (json.title) {
              if (object.movie.name) object.movie.name = json.title;
              if (object.movie.title) object.movie.title = json.title;
			}
            filter.render().find('.filter--sort').append('<span class="lampac-balanser-loader" style="width: 1.2em; height: 1.2em; margin-top: 0; background: url(./img/loader.svg) no-repeat 50% 50%; background-size: contain; margin-left: 0.5em"></span>');
            _this4.lifeSource().then(_this4.startSource).then(resolve)["catch"](reject);
          } else {
            _this4.startSource(json).then(resolve)["catch"](reject);
          }
        }, reject, false, {
            headers: addHeaders()
		  });
      });
    };
    /**
     * Подготовка
     */
    this.create = function() {
      return this.render();
    };
    /**
     * Начать поиск
     */
    this.search = function() { //this.loading(true)
      this.filter({
        source: filter_sources
      }, this.getChoice());
      this.find();
    };
    this.find = function() {
      this.request(this.requestParams(source));
    };
    this.request = function(url) {
      number_of_requests++;
      if (number_of_requests < 10) {
        network["native"](account(url), this.parse.bind(this), this.doesNotAnswer.bind(this), false, {
          dataType: 'text',
		  headers: addHeaders()
        });
        clearTimeout(number_of_requests_timer);
        number_of_requests_timer = setTimeout(function() {
          number_of_requests = 0;
        }, 4000);
      } else this.empty();
    };
    this.parseJsonDate = function(str, name) {
      try {
        var html = $('<div>' + str + '</div>');
        var elems = [];
        html.find(name).each(function() {
          var item = $(this);
          var data = JSON.parse(item.attr('data-json'));
          var season = item.attr('s');
          var episode = item.attr('e');
          var text = item.text();
          if (!object.movie.name) {
            if (text.match(/\d+p/i)) {
              if (!data.quality) {
                data.quality = {};
                data.quality[text] = data.url;
              }
              text = object.movie.title;
            }
            if (text == 'По умолчанию') {
              text = object.movie.title;
            }
          }
          if (episode) data.episode = parseInt(episode);
          if (season) data.season = parseInt(season);
          if (text) data.text = text;
          data.active = item.hasClass('active');
          elems.push(data);
        });
        return elems;
      } catch (e) {
        return [];
      }
    };
    this.getFileUrl = function(file, call, waiting_rch) {
	  var _this = this;
	  
      if(Lampa.Storage.field('player') !== 'inner' && file.stream && Lampa.Platform.is('apple')){
		  var newfile = Lampa.Arrays.clone(file);
		  newfile.method = 'play';
		  newfile.url = file.stream;
		  call(newfile, {});
	  }
      else if (file.method == 'play') call(file, {});
      else {
        Lampa.Loading.start(function() {
          Lampa.Loading.stop();
          Lampa.Controller.toggle('content');
          network.clear();
        });
        network["native"](account(file.url), function(json) {
			if(json.rch){
				if(waiting_rch) {
					waiting_rch = false;
					Lampa.Loading.stop();
					call(false, {});
				}
				else {
					_this.rch(json,function(){
						Lampa.Loading.stop();
						
						_this.getFileUrl(file, call, true);
					});
				}
			}
			else{
				Lampa.Loading.stop();
				call(json, json);
			}
        }, function() {
          Lampa.Loading.stop();
          call(false, {});
        }, false, {
            headers: addHeaders()
		  });
      }
    };
    this.toPlayElement = function(file) {
      var play = {
        title: file.title,
        url: file.url,
        quality: file.qualitys,
        timeline: file.timeline,
        subtitles: file.subtitles,
		segments: file.segments,
        callback: file.mark,
		season: file.season,
		episode: file.episode,
		voice_name: file.voice_name,
		thumbnail: file.thumbnail
      };
      return play;
    };
    this.orUrlReserve = function(data) {
      if (data.url && typeof data.url == 'string' && data.url.indexOf(" or ") !== -1) {
        var urls = data.url.split(" or ");
        data.url = urls[0];
        data.url_reserve = urls[1];
      }
    };
    this.setDefaultQuality = function(data) {
      if (Lampa.Arrays.getKeys(data.quality).length) {
        for (var q in data.quality) {
          if (parseInt(q) == Lampa.Storage.field('video_quality_default')) {
            data.url = data.quality[q];
            this.orUrlReserve(data);
          }
          if (data.quality[q].indexOf(" or ") !== -1)
            data.quality[q] = data.quality[q].split(" or ")[0];
        }
      }
    };
    this.vastClickState = { overlay: null, timer: 0, stopTimer: 0, adEndTimer: 0, observer: null, clickThrough: '', clickTracking: '', progressStart: '', progress1: '', progress15: '', firedStart: false, fired1: false, fired15: false, activeUntil: 0, seenProbe: '', armedSid: '', probeStateLastSid: '', probeStateLastTs: 0, probeStatePending: false, hookedVideo: null, adDuration: 0, progress15Offset: 15, activeProbeSid: '', currentProbeIndex: -1, countedProbeSids: {}, realProbeSids: {}, sentTrackKeys: {}, syntheticTimers: [], syntheticRunning: false, progressNotBefore: 0, syntheticOnly: false, armedAt: 0, seenAdPlayback: false, lastVideoTime: -1, lastVideoSrc: '', adGoneSince: 0 };

    this.stopClientVastClick = function() {
      try {
        if (this.vastClickState.timer) clearInterval(this.vastClickState.timer);
        if (this.vastClickState.stopTimer) clearTimeout(this.vastClickState.stopTimer);
        if (this.vastClickState.adEndTimer) clearTimeout(this.vastClickState.adEndTimer);
        if (this.vastClickState.observer && this.vastClickState.observer.disconnect) this.vastClickState.observer.disconnect();
        if (this.vastClickState.syntheticTimers && this.vastClickState.syntheticTimers.length) {
          for (var sti = 0; sti < this.vastClickState.syntheticTimers.length; sti++) {
            try { clearTimeout(this.vastClickState.syntheticTimers[sti]); } catch (ignoreTimer) {}
          }
        }
      } catch (e) {}

      this.vastClickState.timer = 0;
      this.vastClickState.stopTimer = 0;
      this.vastClickState.adEndTimer = 0;
      this.vastClickState.observer = null;
      this.vastClickState.clickThrough = '';
      this.vastClickState.clickTracking = '';
      this.vastClickState.progressStart = '';
      this.vastClickState.progress1 = '';
      this.vastClickState.progress15 = '';
      this.vastClickState.firedStart = false;
      this.vastClickState.fired1 = false;
      this.vastClickState.fired15 = false;
      this.vastClickState.activeUntil = 0;
      this.vastClickState.seenProbe = '';
      this.vastClickState.armedSid = '';
      this.vastClickState.probeStateLastSid = '';
      this.vastClickState.probeStateLastTs = 0;
      this.vastClickState.probeStatePending = false;
      this.vastClickState.hookedVideo = null;
      this.vastClickState.adDuration = 0;
      this.vastClickState.progress15Offset = 15;
      this.vastClickState.activeProbeSid = '';
      this.vastClickState.currentProbeIndex = -1;
      this.vastClickState.countedProbeSids = {};
      this.vastClickState.realProbeSids = {};
      this.vastClickState.sentTrackKeys = {};
      this.vastClickState.syntheticTimers = [];
      this.vastClickState.syntheticRunning = false;
      this.vastClickState.progressNotBefore = 0;
      this.vastClickState.syntheticOnly = false;
      this.vastClickState.armedAt = 0;
      this.vastClickState.seenAdPlayback = false;
      this.vastClickState.lastVideoTime = -1;
      this.vastClickState.lastVideoSrc = '';
      this.vastClickState.adGoneSince = 0;

      try {
        if (this.vastClickState.overlay && this.vastClickState.overlay.parentNode)
          this.vastClickState.overlay.parentNode.removeChild(this.vastClickState.overlay);
      } catch (e) {}

      this.vastClickState.overlay = null;
    };

    this.startClientVastClick = function(element) {
      var _thisClick = this;

      var currentSid = '';
      try { currentSid = element && element.__veoveo_client_sid ? String(element.__veoveo_client_sid) : ''; } catch (ignore) {}
      if (currentSid && _thisClick.vastClickState.armedSid == currentSid && Date.now() < (_thisClick.vastClickState.activeUntil || 0)) {
        return;
      }

      _thisClick.stopClientVastClick();

      // Vibix uses native VAST tracking. The click layer must follow EVERY ad in the pod.
      // Do not stop the whole observer after the first complete; remove only the current overlay
      // and keep waiting for the next start pixel/media request.
      if (element && element.__vibix_client_vast) {
        startVibixClickOverlay(element);
        return;
      }

      function startVibixClickOverlay(vibixElement) {
        try {
          // Lampa/WebView can treat a VAST attempt from one provider as the only
          // preroll allowed in the current player page. Mark Vibix as the current
          // VAST provider as soon as its client VAST layer is attached; this prevents
          // VeoVeo generated fallback from showing a false click overlay later if
          // Lampa silently refuses to start a second provider's preroll.
          markGlobalClientVastPlayback('vibix', 'vibix_vast_attached');

          var clickItems = [];
          try {
            if (vibixElement.__vibix_click_ads && vibixElement.__vibix_click_ads.length) {
              clickItems = vibixElement.__vibix_click_ads;
            }
          } catch (ignoreItems) {}

          if (!clickItems.length) {
            clickItems = [{
              ct: String(vibixElement.__vibix_click_through || ''),
              ck: String(vibixElement.__vibix_click_tracking || ''),
              dur: Number(vibixElement.__vibix_ad_duration || 0),
              q: '',
              a: '',
              media: String(vibixElement.__vibix_ad_media || '')
            }];
          }

          clickItems = clickItems.filter(function(item) { return item && item.ct; });
          if (!clickItems.length) {
            debug('vibix_click_skip', 'no_clickthrough_items');
            return;
          }

          var active = false;
          var currentItem = null;
          var startedCount = 0;
          var usedKeys = {};
          var seenResourceKeys = {};
          for (var clickIdx = 0; clickIdx < clickItems.length; clickIdx++) {
            try { clickItems[clickIdx].__vibix_click_idx = clickIdx; } catch (ignoreClickIdx) {}
          }
          var perfCursor = 0;
          try {
            perfCursor = (window.performance && performance.getEntriesByType) ? (performance.getEntriesByType('resource') || []).length : 0;
          } catch (ignorePerfCursor) {
            perfCursor = 0;
          }
          var startDeadline = Date.now() + 12000;
          var podDeadline = Date.now() + Math.max(25000, Math.min(120000, clickItems.reduce(function(sum, item) {
            var d = Number(item && item.dur || 0);
            if (!isFinite(d) || d <= 0) d = 12;
            return sum + Math.max(5, Math.min(45, d)) + 8;
          }, 0) * 1000 + 12000));
          var betweenDeadline = 0;

          var normDur = function normDur(item) {
            var d = Number(item && item.dur || 0);
            if (!isFinite(d) || d <= 0) d = 12;
            return Math.max(5, Math.min(45, d));
          };

          var adKeyFromUrl = function adKeyFromUrl(url) {
            return String(getParam(url, 'q') || '') + ':' + String(getParam(url, 'a') || '') + ':' + String(getParam(url, 'pp') || '');
          };

          var adKeyFromItem = function adKeyFromItem(item) {
            return String(item && item.q || '') + ':' + String(item && item.a || '') + ':' + String(item && item.pp || '');
          };

          var itemKeyFromItem = function itemKeyFromItem(item) {
            if (!item) return '';
            return adKeyFromItem(item) + '#idx=' + String(item.__vibix_click_idx == null ? '' : item.__vibix_click_idx);
          };

          var resourceEntryKey = function resourceEntryKey(entry) {
            try {
              return String(entry && entry.name || '') + '@' + String(Math.round(Number(entry && entry.startTime || 0) * 1000));
            } catch (ignoreResKey) {
              return '';
            }
          };

          var markResourceOnce = function markResourceOnce(kind, url, resKey) {
            var k = String(kind || '') + ':' + String(resKey || url || '');
            if (!k || k == ':') return false;
            if (seenResourceKeys[k]) return false;
            seenResourceKeys[k] = true;
            return true;
          };

          var pickItemByUrl = function pickItemByUrl(url) {
            var q = String(getParam(url, 'q') || '');
            var a = String(getParam(url, 'a') || '');
            var pp = String(getParam(url, 'pp') || '');

            for (var i = 0; i < clickItems.length; i++) {
              var it = clickItems[i] || {};
              var key = itemKeyFromItem(it);
              if (usedKeys[key]) continue;
              if (it.q && q && it.q == q && (!it.a || !a || it.a == a) && (!it.pp || !pp || it.pp == pp)) return it;
            }

            for (var j = 0; j < clickItems.length; j++) {
              var fallback = clickItems[j] || {};
              if (!usedKeys[itemKeyFromItem(fallback)]) return fallback;
            }

            return null;
          };

          var removeVibixOverlay = function removeVibixOverlay() {
            try {
              if (_thisClick.vastClickState.overlay && _thisClick.vastClickState.overlay.parentNode)
                _thisClick.vastClickState.overlay.parentNode.removeChild(_thisClick.vastClickState.overlay);
            } catch (e) {}
            _thisClick.vastClickState.overlay = null;
            _thisClick.vastClickState.clickThrough = '';
            _thisClick.vastClickState.clickTracking = '';
            _thisClick.vastClickState.activeUntil = 0;
          };

          var isVibixAdMedia = function isVibixAdMedia(url) {
            url = String(url || '');
            return url.indexOf('/lite/vibix/ad.mp4') != -1 ||
              /kinescope\.io\/embed\/[^\s?]+\/720p/i.test(url) ||
              /kinescopecdn\.net\/.*\/mp4\/.*\.mp4/i.test(url);
          };

          var isVibixStartPixel = function isVibixStartPixel(url) {
            url = String(url || '');
            return /im1\.ufouxbwn\.com/i.test(url) && /[?&]pixel=new_n/i.test(url) && /[?&]e=14(?:&|$)/i.test(url);
          };

          var isVibixEndPixel = function isVibixEndPixel(url) {
            url = String(url || '');
            return /im1\.ufouxbwn\.com/i.test(url) && /[?&]pixel=new_n/i.test(url) && /[?&]e=(24|16)(?:&|$)/i.test(url);
          };

          var ensureVibixOverlay = function ensureVibixOverlay() {
            if (!_thisClick.vastClickState.clickThrough) return;
            if (Date.now() > (_thisClick.vastClickState.activeUntil || 0)) {
              finishCurrentVibixClick('active_timeout');
              return;
            }

            var video = findVideo();
            if (!video) return;

            if (!_thisClick.vastClickState.overlay) {
              var overlay = document.createElement('div');
              overlay.id = 'lampac_vibix_vast_click_overlay';
              overlay.style.position = 'fixed';
              overlay.style.zIndex = '2147483647';
              overlay.style.background = 'rgba(0,0,0,0)';
              overlay.style.cursor = 'pointer';
              overlay.style.pointerEvents = 'none';
              overlay.style.display = 'none';
              ensureClickOverlayRegions(overlay);

              overlay.addEventListener('click', function(e) {
                try {
                  e.preventDefault();
                  e.stopPropagation();
                } catch (ignore) {}

                if (_thisClick.vastClickState.clickTracking) {
                  ping(_thisClick.vastClickState.clickTracking, 'vibix_click');
                }

                var target = _thisClick.vastClickState.clickThrough;
                if (target) setTimeout(function() { openExternal(target); }, 80);
              }, true);

              document.body.appendChild(overlay);
              _thisClick.vastClickState.overlay = overlay;
            }

            var rect = video.getBoundingClientRect ? video.getBoundingClientRect() : null;
            var o = _thisClick.vastClickState.overlay;
            positionClickOverlayOnVideo(o, rect);
          };

          var armVibixClick = function armVibixClick(item, reason, url) {
            if (!item || !item.ct) return;

            var key = itemKeyFromItem(item) || adKeyFromUrl(url || '');
            if (active && currentItem && itemKeyFromItem(currentItem) == key) return;
            if (!active && key && usedKeys[key]) return;

            if (active) finishCurrentVibixClick('rearm');

            active = true;
            currentItem = item;
            markGlobalClientVastPlayback('vibix', reason || 'vibix_ad_start');
            startedCount++;
            if (key) usedKeys[key] = true;

            var dur = normDur(item);
            var hardStopMs = Math.round((dur + 4) * 1000);
            _thisClick.vastClickState.clickThrough = String(item.ct || '');
            _thisClick.vastClickState.clickTracking = String(item.ck || '');
            _thisClick.vastClickState.adDuration = dur;
            try { _thisClick.vastClickState.armedSid = vibixElement.__veoveo_client_sid || ''; } catch (ignoreSid) {}
            _thisClick.vastClickState.activeUntil = Date.now() + hardStopMs;
            betweenDeadline = 0;

            debug('vibix_click_armed', 'reason=' + (reason || '') + ';idx=' + startedCount + '/' + clickItems.length + ';key=' + key + ';dur=' + dur + ';ct=' + String(item.ct || '').slice(0, 120));
            ensureVibixOverlay();

            if (_thisClick.vastClickState.stopTimer) clearTimeout(_thisClick.vastClickState.stopTimer);
            _thisClick.vastClickState.stopTimer = setTimeout(function() {
              finishCurrentVibixClick('ad_timeout');
            }, hardStopMs);
          };

          var finishCurrentVibixClick = function finishCurrentVibixClick(reason) {
            if (!active && !_thisClick.vastClickState.overlay) return;
            debug('vibix_click_finish_current', reason || '');
            if (_thisClick.vastClickState.stopTimer) {
              clearTimeout(_thisClick.vastClickState.stopTimer);
              _thisClick.vastClickState.stopTimer = 0;
            }
            active = false;
            currentItem = null;
            removeVibixOverlay();
            // Do not keep Vibix click observer alive for 10s after the last ad.
            // Android keeps old resource entries visible; with a cursor we process only new entries,
            // but still stop quickly after the last item to avoid false overlay re-arm.
            betweenDeadline = Date.now() + (startedCount >= clickItems.length ? 1500 : 10000);
          };

          var stopVibixClickPod = function stopVibixClickPod(reason) {
            debug('vibix_click_stop_pod', reason || '');
            _thisClick.stopClientVastClick();
          };

          var handleResource = function handleResource(url, resKey) {
            if (!url) return;
            if (isVibixEndPixel(url)) {
              if (!markResourceOnce('end', url, resKey)) return;
              finishCurrentVibixClick('end_pixel');
              return;
            }
            if (isVibixStartPixel(url)) {
              if (!markResourceOnce('start', url, resKey)) return;
              armVibixClick(pickItemByUrl(url), 'start_pixel', url);
              return;
            }
            if (isVibixAdMedia(url)) {
              if (!markResourceOnce('media', url, resKey)) return;
              if (!active) armVibixClick(pickItemByUrl(url), 'media', url);
              return;
            }
          };

          var scanVibixPerf = function scanVibixPerf() {
            try {
              if (!window.performance || !performance.getEntriesByType) return;
              var entries = performance.getEntriesByType('resource') || [];
              if (perfCursor > entries.length) perfCursor = entries.length;
              for (var i = perfCursor; i < entries.length; i++) {
                var entry = entries[i];
                handleResource(entry && entry.name || '', resourceEntryKey(entry));
              }
              perfCursor = entries.length;
            } catch (e) {}
          };

          try {
            if (window.PerformanceObserver) {
              var obs = new PerformanceObserver(function(list) {
                var entries = list.getEntries ? list.getEntries() : [];
                for (var i = 0; i < entries.length; i++) {
                  var entry = entries[i];
                  handleResource(entry && entry.name || '', resourceEntryKey(entry));
                }
              });
              obs.observe({ entryTypes: ['resource'] });
              _thisClick.vastClickState.observer = obs;
            }
          } catch (e) {}

          scanVibixPerf();
          _thisClick.vastClickState.timer = setInterval(function() {
            scanVibixPerf();

            if (active) {
              ensureVibixOverlay();
              return;
            }

            var now = Date.now();
            if (!startedCount && now > startDeadline) {
              stopVibixClickPod('not_started');
              return;
            }

            if (betweenDeadline && now > betweenDeadline && startedCount >= clickItems.length) {
              stopVibixClickPod('all_ads_done');
              return;
            }

            if (now > podDeadline) {
              stopVibixClickPod('pod_deadline');
            }
          }, 350);

          _thisClick.vastClickState.stopTimer = setTimeout(function() {
            if (!startedCount) stopVibixClickPod('start_timeout');
          }, 12500);
        } catch (e) {
          debug('vibix_click_throw', shortErr(e));
          try { _thisClick.stopClientVastClick(); } catch (ignoreStop) {}
        }
      }

      if (!element || !element.vast_url || (element.vast_url.indexOf('/lite/veoveo/vast') == -1 && element.vast_url.indexOf('/lite/vibix/vast') == -1 && element.vast_url.indexOf('/lite/kodik/vast') == -1 && !element.__veoveo_client_vast))
        return;

      function getParam(url, name) {
        try {
          var re = new RegExp('[?&]' + name + '=([^&#]*)', 'i');
          var m = re.exec(url || '');
          return m ? decodeURIComponent((m[1] || '').replace(/\+/g, ' ')) : '';
        } catch (e) {
          return '';
        }
      }

      function decodeLink(value) {
        if (!value) return '';
        try {
          value = decodeURIComponent(value).replace(/-/g, '+').replace(/_/g, '/');
          while (value.length % 4) value += '=';

          var binary = atob(value);
          try {
            return decodeURIComponent(Array.prototype.map.call(binary, function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
          } catch (e) {
            return binary;
          }
        } catch (e) {
          return '';
        }
      }

      function toNumber(value, def) {
        var n = Number(value);
        return isFinite(n) ? n : (def || 0);
      }

      function addCacheBust(url) {
        if (!url) return url;
        return url + (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
      }

      function getProbeSid(url) {
        return getParam(url || '', 'sid') || '';
      }

      function findProbeIndex(url, probeSid) {
        try {
          var list = element.__veoveo_probe_urls || [];
          if (!list || !list.length) return -1;

          if (probeSid) {
            for (var i = 0; i < list.length; i++) {
              if (getProbeSid(list[i]) == probeSid) return i;
            }
          }

          for (var j = 0; j < list.length; j++) {
            if (String(list[j] || '') == String(url || '')) return j;
          }
        } catch (e) {}

        return -1;
      }

      function rememberSyntheticTimer(timer) {
        try {
          _thisClick.vastClickState.syntheticTimers = _thisClick.vastClickState.syntheticTimers || [];
          _thisClick.vastClickState.syntheticTimers.push(timer);
        } catch (e) {}
        return timer;
      }

      function shortErr(e) {
        try {
          if (!e) return '';
          if (typeof e == 'string') return e;
          if (e.message) return e.message;
          return String(e);
        } catch (ignore) {}
        return '';
      }

      function nativeRequestText(url, headers, ev, onOk, onErr, opts) {
        opts = opts || {};
        try {
          if (!Lampa || !Lampa.Reguest) return false;
          var r = new Lampa.Reguest();
          if (!r || typeof r.native != 'function') return false;

          var timeout = opts.timeout || 15000;
          if (r.timeout) r.timeout(timeout);

          var done = false;
          var timer = setTimeout(function() {
            if (done) return;
            done = true;
            debug((ev || 'native') + '_timeout', String(timeout));
            try { if (onErr) onErr(new Error('native timeout')); } catch (ignore) {}
          }, timeout);

          var nativeOptions = {
            headers: headers || {},
            dataType: opts.dataType || 'text',
            timeout: timeout,
            cache: false
          };

          if (opts.method) {
            nativeOptions.method = opts.method;
            nativeOptions.type = opts.method;
          }

          var postData = opts.body != null ? opts.body : false;
          if (opts.body != null) {
            nativeOptions.body = opts.body;
            nativeOptions.data = opts.body;
            nativeOptions.post = true;
            nativeOptions.contentType = (headers && (headers['Content-Type'] || headers['content-type'])) || 'text/plain;charset=UTF-8';
          }

          r.native(addCacheBust(url), function(data) {
            if (done) return;
            done = true;
            clearTimeout(timer);

            var text = '';
            try {
              if (typeof data == 'string') text = data;
              else if (data && typeof data.responseText == 'string') text = data.responseText;
              else if (data && typeof data.text == 'string') text = data.text;
              else if (data != null) text = JSON.stringify(data);
            } catch (ignore) {}

            try { if (onOk) onOk(text, data); } catch (ignore) {}
          }, function(err, xhr) {
            if (done) return;
            done = true;
            clearTimeout(timer);

            var status = '';
            try { status = (xhr && xhr.status) || (err && err.status) || ''; } catch (ignore) {}
            debug((ev || 'native') + '_err', 'status=' + status + ';err=' + shortErr(err));
            try { if (onErr) onErr(err || new Error('native fail ' + status)); } catch (ignore) {}
          }, postData, nativeOptions);

          return true;
        } catch (e) {
          debug((ev || 'native') + '_throw', shortErr(e));
          return false;
        }
      }

      function debug(ev, extra) {
        try {
          var enabled = false;
          try {
            enabled = window.__veoveo_vast_debug === true ||
              window.__veoveo_vast_debug === '1' ||
              localStorage.getItem('veoveo_vast_debug') == '1';
          } catch (ignoreDbg) {}
          if (!enabled) return;

          var base = element.__veoveo_client_debug_base || '';
          if (!base) return;
          var url = base + (base.indexOf('?') >= 0 ? '&' : '?') +
            'sid=' + encodeURIComponent(element.__veoveo_client_sid || '') +
            '&ev=' + encodeURIComponent(ev || '') +
            '&t=' + Date.now();
          if (extra) url += '&x=' + encodeURIComponent(String(extra).slice(0, 500));
          var img = new Image();
          img.src = url;
        } catch (e) {}
      }

      function markGlobalClientVastPlayback(provider, reason) {
        try {
          window.__lampac_client_vast_played_provider = String(provider || '');
          window.__lampac_client_vast_played_at = Date.now();
          window.__lampac_client_vast_played_reason = String(reason || '');
        } catch (e) {}
      }

      function getGlobalClientVastPlaybackProvider() {
        try {
          return String(window.__lampac_client_vast_played_provider || '');
        } catch (e) {}
        return '';
      }

      function allowGeneratedFallbackForProvider(provider) {
        var prev = getGlobalClientVastPlaybackProvider();
        if (!prev) return true;
        return prev == String(provider || '');
      }

      function tryNativeTracking(url, headers, ev) {
        debug((ev || 'stats') + '_native', 'headers=' + Object.keys(headers || {}).join(',').slice(0, 180));

        return nativeRequestText(url, headers || {}, ev || 'stats', function(text) {
          debug((ev || 'stats') + '_status', 'native_ok;len=' + ((text || '').length));
        }, function(err) {
          debug((ev || 'stats') + '_native_err', shortErr(err));
        }, {
          timeout: 15000,
          dataType: 'text'
        });
      }

      function ping(url, ev) {
        if (!url) return;

        var finalUrl = addCacheBust(url);
        var isPlayerStats = /\/api-integration\/player\/stats/i.test(url);
        var reqHeaders = element.__veoveo_req_headers || null;

        // In VeoVeo client VAST mode all counted tracking should leave the same
        // Lampa native layer/device context that loaded iframe/VAST.
        if (reqHeaders) {
          if (!tryNativeTracking(finalUrl, reqHeaders, ev || (isPlayerStats ? 'stats' : 'track')))
            debug((ev || 'track') + '_native_skip', 'no_native');
          return;
        }

        try {
          debug(ev || 'pixel', isPlayerStats ? 'image_stats_no_headers' : 'image_no_headers');
          var img = new Image();
          img.src = finalUrl;
        } catch (e) {}
      }

      function pingOnce(url, ev, probeSid) {
        if (!url) return;

        try {
          var sid = probeSid || _thisClick.vastClickState.activeProbeSid || getProbeSid(_thisClick.vastClickState.seenProbe || '') || '';
          // De-dupe by ad-slot + tracking URL, not by our local event label.
          // The same stats URL can be reached as progress_15, progress_15_guard,
          // synthetic_end, or ended on short 15s creatives; it must leave only once.
          var key = sid + '|' + String(url || '');
          _thisClick.vastClickState.sentTrackKeys = _thisClick.vastClickState.sentTrackKeys || {};
          if (_thisClick.vastClickState.sentTrackKeys[key]) {
            debug('track_dupe_skip', key.slice(0, 240));
            return;
          }
          _thisClick.vastClickState.sentTrackKeys[key] = true;
        } catch (ignore) {}

        ping(url, ev);
      }

      function openExternal(url) {
        if (!url) return;

        try {
          if (Lampa.Platform && typeof Lampa.Platform.openURL == 'function') {
            Lampa.Platform.openURL(url);
            return;
          }
        } catch (e) {}

        try {
          window.open(url, '_blank');
          return;
        } catch (e) {}

        try {
          window.location.href = url;
        } catch (e) {}
      }

      function findVideo() {
        var videos = document.querySelectorAll('video');
        if (!videos || !videos.length) return null;

        for (var i = 0; i < videos.length; i++) {
          var rect = videos[i].getBoundingClientRect ? videos[i].getBoundingClientRect() : null;
          if (rect && rect.width > 20 && rect.height > 20) return videos[i];
        }

        return videos[0];
      }

      function ensureClickOverlayRegions(overlay) {
        if (!overlay || overlay.__lampacClickRegionsBuilt) return;
        overlay.__lampacClickRegionsBuilt = true;
        overlay.__lampacClickRegions = [];
        overlay.style.pointerEvents = 'none';
        overlay.style.overflow = 'hidden';

        for (var i = 0; i < 2; i++) {
          var region = document.createElement('div');
          region.className = 'lampac_vast_click_region';
          region.style.position = 'absolute';
          region.style.background = 'rgba(0,0,0,0)';
          region.style.cursor = 'pointer';
          region.style.pointerEvents = 'auto';
          region.style.display = 'block';
          overlay.appendChild(region);
          overlay.__lampacClickRegions.push(region);
        }
      }

      function setRegionBox(region, left, top, width, height) {
        if (!region) return;
        width = Math.max(0, Math.round(width || 0));
        height = Math.max(0, Math.round(height || 0));
        region.style.left = Math.round(left || 0) + 'px';
        region.style.top = Math.round(top || 0) + 'px';
        region.style.width = width + 'px';
        region.style.height = height + 'px';
        region.style.display = (width > 2 && height > 2) ? 'block' : 'none';
      }

      function layoutClickOverlayRegions(overlay, width, height) {
        ensureClickOverlayRegions(overlay);
        var regions = overlay.__lampacClickRegions || [];
        width = Math.max(0, Math.round(width || 0));
        height = Math.max(0, Math.round(height || 0));

        // Keep a real click-through area over the bottom-right Skip button,
        // but make it smaller than the previous fix so the ad click area goes lower.
        var safeW = Math.round(width * 0.27);
        var safeH = Math.round(height * 0.13);
        safeW = Math.max(170, Math.min(safeW, Math.round(width * 0.45)));
        safeH = Math.max(48, Math.min(safeH, Math.round(height * 0.24)));

        var topH = Math.max(0, height - safeH);
        var bottomClickableW = Math.max(0, width - safeW);

        setRegionBox(regions[0], 0, 0, width, topH);
        setRegionBox(regions[1], 0, topH, bottomClickableW, safeH);
      }

      function positionClickOverlayOnVideo(overlay, rect) {
        if (!overlay) return;
        var left = 0;
        var top = 0;
        var width = window.innerWidth || document.documentElement.clientWidth || 0;
        var height = window.innerHeight || document.documentElement.clientHeight || 0;

        if (rect && rect.width > 20 && rect.height > 20) {
          left = rect.left;
          top = rect.top;
          width = rect.width;
          height = rect.height;
        }

        overlay.style.left = left + 'px';
        overlay.style.top = top + 'px';
        overlay.style.width = width + 'px';
        overlay.style.height = height + 'px';
        overlay.style.display = 'block';
        layoutClickOverlayRegions(overlay, width, height);
      }

      function ensureVideoHooks(video) {
        if (!video || _thisClick.vastClickState.hookedVideo === video)
          return;

        _thisClick.vastClickState.hookedVideo = video;

        try {
          video.addEventListener('timeupdate', ensureProgressTracking, false);
          video.addEventListener('playing', ensureProgressTracking, false);
          video.addEventListener('play', ensureProgressTracking, false);
          video.addEventListener('loadedmetadata', ensureProgressTracking, false);
          video.addEventListener('canplay', ensureProgressTracking, false);
          video.addEventListener('durationchange', ensureProgressTracking, false);
          video.addEventListener('ended', function() {
            if (Date.now() > _thisClick.vastClickState.activeUntil) return;
            if (_thisClick.vastClickState.syntheticOnly) return;
            if (_thisClick.vastClickState.progressNotBefore && Date.now() < _thisClick.vastClickState.progressNotBefore) return;

            var dur = 0;
            try { dur = Number(video.duration || 0); } catch (e) { dur = 0; }
            if (!isFinite(dur) || dur <= 0) dur = _thisClick.vastClickState.adDuration || 0;

            // If the ad ended before the configured progress marker, send it once.
            // If progress_15 was already sent during playback, ended is only cleanup.
            if (!_thisClick.vastClickState.fired15 && _thisClick.vastClickState.progress15 && (dur >= 8 || _thisClick.vastClickState.fired1)) {
              _thisClick.vastClickState.fired15 = true;
              pingOnce(_thisClick.vastClickState.progress15, 'progress_15');
            }

            finishActiveProbePlayback('ended');
          }, false);
        } catch (e) {}
      }

      function isLikelyVastAdPlayback(video) {
        if (!video) return false;

        // Real /media-probe detected by PerformanceObserver is already enough evidence.
        if (!_thisClick.vastClickState.generatedFallback)
          return true;

        var src = '';
        try { src = String(video.currentSrc || video.src || ''); } catch (ignoreSrc) {}
        if (/\/lite\/((veoveo|kodik)\/media-probe|vibix\/ad-media)/i.test(src))
          return true;

        var dur = 0;
        var adDur = 0;
        try { dur = Number(video.duration || 0); } catch (ignoreDur) { dur = 0; }
        try { adDur = Number(_thisClick.vastClickState.adDuration || 0); } catch (ignoreAdDur) { adDur = 0; }

        if (isFinite(dur) && dur > 0) {
          if (adDur > 0 && dur <= Math.max(adDur + 8, 45)) return true;
          if (dur <= 90) return true;
          return false;
        }

        // Unknown/Infinity duration is usually the main HLS/movie stream, not a finite VAST mp4.
        // Do not show the advertiser overlay on it unless a real probe URL was observed above.
        return false;
      }

      function markActiveAdSeen(video, t, src) {
        try {
          _thisClick.vastClickState.seenAdPlayback = true;
          _thisClick.vastClickState.adGoneSince = 0;
          if (src) _thisClick.vastClickState.lastVideoSrc = src;
          if (isFinite(t) && t >= 0) _thisClick.vastClickState.lastVideoTime = t;
        } catch (e) {}
      }

      function maybeFinishBecausePlaybackLeftAd(reason) {
        try {
          if (!_thisClick.vastClickState.activeProbeSid) return false;

          var now = Date.now();
          var hadAdEvidence = !!(_thisClick.vastClickState.seenAdPlayback || _thisClick.vastClickState.firedStart || _thisClick.vastClickState.fired1 || _thisClick.vastClickState.fired15);
          var armedAt = Number(_thisClick.vastClickState.armedAt || 0);

          // Do not kill the slot while the generated probe is waiting for the ad player
          // to attach the next creative. But once we have seen ad playback, leaving it
          // must remove the click layer quickly (skip button case).
          if (!hadAdEvidence) {
            if (!_thisClick.vastClickState.syntheticOnly) return false;
            if (!armedAt || now - armedAt < 8000) return false;
          }

          if (!_thisClick.vastClickState.adGoneSince) {
            _thisClick.vastClickState.adGoneSince = now;
            return false;
          }

          if (now - _thisClick.vastClickState.adGoneSince < 650) return false;

          finishActiveProbePlayback(reason || 'playback_left_ad');
          return true;
        } catch (e) {
          debug('playback_left_throw', shortErr(e));
        }
        return false;
      }

      function maybeFinishBecauseAdHandoff(video, t, src) {
        try {
          if (!_thisClick.vastClickState.activeProbeSid) return false;
          if (!(_thisClick.vastClickState.seenAdPlayback || _thisClick.vastClickState.firedStart || _thisClick.vastClickState.fired1 || _thisClick.vastClickState.fired15)) return false;

          var now = Date.now();
          var armedAt = Number(_thisClick.vastClickState.armedAt || 0);
          if (armedAt && now - armedAt < 900) return false;

          var prevSrc = String(_thisClick.vastClickState.lastVideoSrc || '');
          var prevT = Number(_thisClick.vastClickState.lastVideoTime);
          if (!isFinite(prevT) || prevT < 0) prevT = -1;

          // Skip/transition usually resets currentTime or swaps the media URL. Finish
          // the current ad-slot immediately so its overlay does not sit over the next
          // ad/movie for the rest of the nominal duration.
          if (prevSrc && src && prevSrc != src && (_thisClick.vastClickState.fired1 || _thisClick.vastClickState.fired15)) {
            finishActiveProbePlayback('video_src_changed');
            return true;
          }

          if (prevT > 3 && isFinite(t) && t + 1.25 < prevT && (_thisClick.vastClickState.fired1 || _thisClick.vastClickState.fired15)) {
            finishActiveProbePlayback('video_time_reset');
            return true;
          }

          var adDur = Number(_thisClick.vastClickState.adDuration || 0);
          if (isFinite(adDur) && adDur > 0 && isFinite(t) && t > adDur + 2) {
            finishActiveProbePlayback('video_past_ad_duration');
            return true;
          }
        } catch (e) {
          debug('handoff_detect_throw', shortErr(e));
        }
        return false;
      }

      function ensureProgressTracking() {
        if (Date.now() > _thisClick.vastClickState.activeUntil) return;

        var video = findVideo();
        if (!video) return;

        ensureVideoHooks(video);

        if (!isLikelyVastAdPlayback(video)) {
          maybeFinishBecausePlaybackLeftAd('not_ad_playback');
          return;
        }

        var t = 0;
        var dur = 0;
        var src = '';
        try { t = Number(video.currentTime || 0); } catch (e) { t = 0; }
        try { dur = Number(video.duration || 0); } catch (e) { dur = 0; }
        try { src = String(video.currentSrc || video.src || ''); } catch (ignoreSrc) { src = ''; }
        if (!isFinite(t) || t < 0) t = 0;
        if (!isFinite(dur) || dur <= 0) dur = _thisClick.vastClickState.adDuration || 0;

        if (maybeFinishBecauseAdHandoff(video, t, src)) return;
        markActiveAdSeen(video, t, src);

        // For generated next ads we do not use the current video time.
        // On Lampa/WebView the same video element can keep currentTime ~= 14-15
        // during the handoff from ad #1 to ad #2, which instantly fires all
        // tracking for ad #2 and removes its click layer. Synthetic timers keep
        // the overlay clickable for the actual second ad window.
        if (_thisClick.vastClickState.syntheticOnly) {
          ensureOverlay();
          return;
        }

        if (_thisClick.vastClickState.progressNotBefore && Date.now() < _thisClick.vastClickState.progressNotBefore) {
          ensureOverlay();
          return;
        }

        // Fire only when the ad video actually started advancing.
        if (!_thisClick.vastClickState.firedStart && _thisClick.vastClickState.progressStart && t > 0.05) {
          _thisClick.vastClickState.firedStart = true;
          markGlobalClientVastPlayback('veoveo', 'start');
          pingOnce(_thisClick.vastClickState.progressStart, 'start');
          scheduleActiveProbeEndGuard(_thisClick.vastClickState.activeProbeSid || getProbeSid(_thisClick.vastClickState.seenProbe || ''), dur, 'playback_start', t);
        }

        if (!_thisClick.vastClickState.fired1 && _thisClick.vastClickState.progress1 && t >= 1) {
          _thisClick.vastClickState.fired1 = true;
          markGlobalClientVastPlayback('veoveo', 'progress_1');
          pingOnce(_thisClick.vastClickState.progress1, 'progress_1');
          scheduleActiveProbeEndGuard(_thisClick.vastClickState.activeProbeSid || getProbeSid(_thisClick.vastClickState.seenProbe || ''), dur, 'progress_1', t);
        }

        if (!_thisClick.vastClickState.fired15 && _thisClick.vastClickState.progress15) {
          var offset = _thisClick.vastClickState.progress15Offset || 15;
          var threshold = offset;

          if (dur > 0) {
            // If the requested offset equals/exceeds the ad duration, fire slightly before the end.
            // This avoids missing UA/UA-short ads where the player switches source immediately at 15 sec.
            threshold = Math.min(offset, Math.max(1, dur - 1.50));
          }

          if (t >= threshold) {
            _thisClick.vastClickState.fired15 = true;
            markGlobalClientVastPlayback('veoveo', 'progress_15');
            pingOnce(_thisClick.vastClickState.progress15, 'progress_15');
            // progress_15/stats is only a marker. The ad slot finishes only on
            // ended or the duration guard, otherwise 15s creatives can arm ad #2
            // while ad #1 is still on its last frames.
            scheduleActiveProbeEndGuard(_thisClick.vastClickState.activeProbeSid || getProbeSid(_thisClick.vastClickState.seenProbe || ''), dur, 'progress_15', t);
          }
        }
      }

      function ensureOverlay() {
        if (!_thisClick.vastClickState.clickThrough)
          return;

        if (Date.now() > _thisClick.vastClickState.activeUntil) {
          _thisClick.stopClientVastClick();
          return;
        }

        var video = findVideo();
        if (!video) return;
        if (!isLikelyVastAdPlayback(video)) {
          maybeFinishBecausePlaybackLeftAd('overlay_not_ad');
          return;
        }

        if (!_thisClick.vastClickState.overlay) {
          var overlay = document.createElement('div');
          overlay.id = 'lampac_veoveo_vast_click_overlay';
          overlay.style.position = 'fixed';
          overlay.style.zIndex = '2147483647';
          overlay.style.background = 'rgba(0,0,0,0)';
          overlay.style.cursor = 'pointer';
          overlay.style.pointerEvents = 'none';
          overlay.style.display = 'none';
          ensureClickOverlayRegions(overlay);

          overlay.addEventListener('click', function(e) {
            try {
              e.preventDefault();
              e.stopPropagation();
            } catch (ignore) {}

            ping(_thisClick.vastClickState.clickTracking, 'click');

            setTimeout(function() {
              openExternal(_thisClick.vastClickState.clickThrough);
            }, 80);
          }, true);

          document.body.appendChild(overlay);
          _thisClick.vastClickState.overlay = overlay;
        }

        var rect = video.getBoundingClientRect ? video.getBoundingClientRect() : null;
        var o = _thisClick.vastClickState.overlay;
        positionClickOverlayOnVideo(o, rect);
      }

      function removeClickOverlay(reason) {
        try {
          if (_thisClick.vastClickState.overlay && _thisClick.vastClickState.overlay.parentNode)
            _thisClick.vastClickState.overlay.parentNode.removeChild(_thisClick.vastClickState.overlay);
        } catch (e) {}

        _thisClick.vastClickState.overlay = null;
        _thisClick.vastClickState.clickThrough = '';
        _thisClick.vastClickState.clickTracking = '';
        debug('overlay_removed', reason || '');
      }

      function markProbeCountedBySid(probeSid, reason) {
        if (!probeSid) return;
        try {
          _thisClick.vastClickState.countedProbeSids = _thisClick.vastClickState.countedProbeSids || {};
          if (_thisClick.vastClickState.countedProbeSids[probeSid]) return;
          _thisClick.vastClickState.countedProbeSids[probeSid] = true;
          debug('probe_counted', 'sid=' + probeSid + ';reason=' + (reason || ''));
        } catch (e) {}
      }

      function clearActiveProbeEndGuard() {
        try {
          if (_thisClick.vastClickState.adEndTimer) clearTimeout(_thisClick.vastClickState.adEndTimer);
        } catch (ignore) {}
        _thisClick.vastClickState.adEndTimer = 0;
      }

      function scheduleActiveProbeEndGuard(probeSid, dur, source, currentTime) {
        if (!probeSid) return;
        if (_thisClick.vastClickState.adEndTimer) return;

        var d = Number(dur || 0);
        if (!isFinite(d) || d <= 0) d = Number(_thisClick.vastClickState.adDuration || 0);
        if (!isFinite(d) || d <= 0) return;
        d = Math.max(5, Math.min(65, d));

        var t = Number(currentTime || 0);
        if (!isFinite(t) || t < 0) t = 0;

        var delay = Math.max(900, Math.round((d - t) * 1000) + 1400);
        delay = Math.min(delay, Math.round((d + 2.5) * 1000));

        _thisClick.vastClickState.adEndTimer = setTimeout(function() {
          try {
            if ((_thisClick.vastClickState.activeProbeSid || '') != probeSid) return;

            if (!_thisClick.vastClickState.fired15 && _thisClick.vastClickState.progress15) {
              _thisClick.vastClickState.fired15 = true;
              pingOnce(_thisClick.vastClickState.progress15, 'progress_15_guard', probeSid);
            }

            finishActiveProbePlayback('end_guard');
          } catch (e) {
            debug('end_guard_throw', shortErr(e));
          }
        }, delay);
        debug('end_guard_set', 'sid=' + probeSid + ';delay=' + delay + ';dur=' + d + ';t=' + t + ';src=' + (source || ''));
      }

      function hasAnyRealProbe() {
        try {
          var map = _thisClick.vastClickState.realProbeSids || {};
          for (var k in map) { if (map[k]) return true; }
        } catch (e) {}
        return false;
      }

      function finishActiveProbePlayback(reason) {
        var sid = _thisClick.vastClickState.activeProbeSid || getProbeSid(_thisClick.vastClickState.seenProbe || '');
        markProbeCountedBySid(sid, reason || 'complete');
        clearActiveProbeEndGuard();

        var nextProbe = '';
        var nextSid = '';
        var nextIndex = -1;
        try {
          var list = element.__veoveo_probe_urls || [];
          var currentIndex = Number(_thisClick.vastClickState.currentProbeIndex);
          if (!isFinite(currentIndex) || currentIndex < 0) {
            currentIndex = findProbeIndex(_thisClick.vastClickState.seenProbe || '', _thisClick.vastClickState.activeProbeSid || '');
          }

          nextIndex = currentIndex + 1;
          if (list && nextIndex > 0 && nextIndex < list.length) {
            nextProbe = list[nextIndex] || '';
            nextSid = getProbeSid(nextProbe || '');
          }
        } catch (ignoreNext) {}

        if (nextProbe && nextSid && !(_thisClick.vastClickState.countedProbeSids && _thisClick.vastClickState.countedProbeSids[nextSid])) {
          // Always arm the next pod item after the current ad slot is finished.
          // Do NOT block this just because a previous /media-probe was visible in
          // PerformanceObserver: on many TV/WebView builds ad #1 is visible there,
          // while ad #2 is not. Waiting for the second real probe kills overlay and
          // all progress/stats for ad #2.
          debug('overlay_next_arm', 'idx=' + nextIndex + ';sid=' + nextSid + ';reason=' + (reason || ''));
          rememberSyntheticTimer(setTimeout(function() {
            if (_thisClick.vastClickState.countedProbeSids && _thisClick.vastClickState.countedProbeSids[nextSid]) return;
            // If the real second media-probe arrived during this delay, acceptProbeUrl
            // has already armed the same sid and this call becomes a no-op.
            acceptProbeUrl(nextProbe, 'generated_next');
          }, 1200));
          return;
        }

        // No next ad in the pod: remove the invisible click-through layer so player controls
        // do not open the advertiser after preroll.
        removeClickOverlay(reason || 'active');
      }

      function fireSyntheticProbe(probeUrl, index, reason) {
        try {
          var probeSid = getProbeSid(probeUrl || '');
          if (!probeUrl || !probeSid) return;

          _thisClick.vastClickState.countedProbeSids = _thisClick.vastClickState.countedProbeSids || {};
          _thisClick.vastClickState.realProbeSids = _thisClick.vastClickState.realProbeSids || {};

          if (_thisClick.vastClickState.countedProbeSids[probeSid]) {
            debug('synthetic_skip', 'already_counted=' + probeSid);
            return;
          }

          // If the player/WebView really requested this ad media, do not fake it.
          // The normal video-time hooks will count it with the real ad playback.
          if (_thisClick.vastClickState.realProbeSids[probeSid]) {
            debug('synthetic_skip', 'real_probe=' + probeSid);
            return;
          }

          var st = decodeLink(getParam(probeUrl, 'st'));
          var p1 = decodeLink(getParam(probeUrl, 'p1'));
          var p15 = decodeLink(getParam(probeUrl, 'p15'));
          var offset = toNumber(getParam(probeUrl, 'p15o'), 15) || 15;
          var syntheticDur = toNumber(getParam(probeUrl, 'dur'), 0) || 0;

          if (!st && !p1 && !p15) return;

          _thisClick.vastClickState.syntheticRunning = true;
          debug('synthetic_start', 'idx=' + index + ';sid=' + probeSid + ';off=' + offset + ';dur=' + syntheticDur + ';reason=' + (reason || ''));

          if (st) rememberSyntheticTimer(setTimeout(function() {
            if (_thisClick.vastClickState.countedProbeSids && _thisClick.vastClickState.countedProbeSids[probeSid]) return;
            pingOnce(st, 'start', probeSid);
          }, 250));

          if (p1) rememberSyntheticTimer(setTimeout(function() {
            if (_thisClick.vastClickState.countedProbeSids && _thisClick.vastClickState.countedProbeSids[probeSid]) return;
            pingOnce(p1, 'progress_1', probeSid);
          }, 1250));

          if (p15) {
            var delay = Math.max(2500, Math.min(20000, Math.round(offset * 1000)));
            rememberSyntheticTimer(setTimeout(function() {
              if (_thisClick.vastClickState.countedProbeSids && _thisClick.vastClickState.countedProbeSids[probeSid]) return;
              pingOnce(p15, 'progress_15', probeSid);
            }, delay));
          }

          var finishDelay = syntheticDur > 0
            ? Math.max(1800, Math.round(syntheticDur * 1000) + 1400)
            : (p15 ? Math.max(3500, Math.round(offset * 1000) + 1400) : 1800);

          rememberSyntheticTimer(setTimeout(function() {
            if (_thisClick.vastClickState.countedProbeSids && _thisClick.vastClickState.countedProbeSids[probeSid]) return;
            if (p15) pingOnce(p15, 'progress_15', probeSid);
            markProbeCountedBySid(probeSid, p15 ? 'synthetic_end' : 'synthetic_no_p15');
            if ((_thisClick.vastClickState.activeProbeSid || '') == probeSid) {
              removeClickOverlay(p15 ? 'synthetic_end' : 'synthetic_no_p15');
            }
            _thisClick.vastClickState.syntheticRunning = false;
            scheduleNextProbeTracking(p15 ? 'synthetic_end' : 'synthetic_no_p15');
          }, finishDelay));
        } catch (e) {
          debug('synthetic_throw', shortErr(e));
          try { _thisClick.vastClickState.syntheticRunning = false; } catch (ignore) {}
        }
      }

      function scheduleNextProbeTracking(reason) {
        try {
          var list = element.__veoveo_probe_urls || [];
          if (!list || list.length < 2) return;

          if (_thisClick.vastClickState.syntheticRunning) return;

          var currentIndex = Number(_thisClick.vastClickState.currentProbeIndex);
          if (!isFinite(currentIndex) || currentIndex < 0) {
            currentIndex = findProbeIndex(_thisClick.vastClickState.seenProbe || '', _thisClick.vastClickState.activeProbeSid || '');
          }

          var nextIndex = currentIndex + 1;
          if (nextIndex <= 0 || nextIndex >= list.length) return;

          var nextProbe = list[nextIndex];
          var nextSid = getProbeSid(nextProbe || '');
          if (!nextProbe || !nextSid) return;

          _thisClick.vastClickState.countedProbeSids = _thisClick.vastClickState.countedProbeSids || {};
          if (_thisClick.vastClickState.countedProbeSids[nextSid]) return;

          debug('synthetic_schedule', 'idx=' + nextIndex + ';sid=' + nextSid + ';reason=' + (reason || ''));
          rememberSyntheticTimer(setTimeout(function() {
            fireSyntheticProbe(nextProbe, nextIndex, reason || 'next');
          }, 900));
        } catch (e) {
          debug('synthetic_schedule_throw', shortErr(e));
        }
      }

      function acceptProbeUrl(url, source) {
        if (!url || !(/\/lite\/(veoveo|kodik)\/media-probe/i.test(url)))
          return false;

        var probeSid = getProbeSid(url || '');
        var isRealProbe = source == 'perf';
        if (isRealProbe && probeSid) {
          _thisClick.vastClickState.realProbeSids = _thisClick.vastClickState.realProbeSids || {};
          _thisClick.vastClickState.realProbeSids[probeSid] = true;
        }

        if (_thisClick.vastClickState.seenProbe == url)
          return true;

        if (probeSid && (_thisClick.vastClickState.activeProbeSid || '') == probeSid)
          return true;

        if (probeSid && _thisClick.vastClickState.countedProbeSids && _thisClick.vastClickState.countedProbeSids[probeSid]) {
          debug('probe_already_counted', probeSid);
          return true;
        }

        var ct = decodeLink(getParam(url, 'ct'));
        var ck = decodeLink(getParam(url, 'ck'));
        var st = decodeLink(getParam(url, 'st'));
        var p1 = decodeLink(getParam(url, 'p1'));
        var p15 = decodeLink(getParam(url, 'p15'));
        var dur = toNumber(getParam(url, 'dur'), 0);
        var p15o = toNumber(getParam(url, 'p15o'), 15);
        var syntheticOnly = source == 'generated_next';

        if (!ct && !st && !p1 && !p15)
          return false;

        _thisClick.vastClickState.seenProbe = url;
        try { _thisClick.vastClickState.armedSid = element && element.__veoveo_client_sid ? String(element.__veoveo_client_sid) : ''; } catch (ignore) {}
        _thisClick.vastClickState.activeProbeSid = probeSid || '';
        _thisClick.vastClickState.currentProbeIndex = findProbeIndex(url, probeSid);
        _thisClick.vastClickState.clickThrough = ct;
        _thisClick.vastClickState.clickTracking = ck;
        _thisClick.vastClickState.progressStart = st;
        _thisClick.vastClickState.progress1 = p1;
        _thisClick.vastClickState.progress15 = p15;
        _thisClick.vastClickState.adDuration = dur;
        _thisClick.vastClickState.progress15Offset = p15o || 15;
        _thisClick.vastClickState.hookedVideo = null;
        _thisClick.vastClickState.firedStart = false;
        _thisClick.vastClickState.fired1 = false;
        _thisClick.vastClickState.fired15 = false;
        _thisClick.vastClickState.syntheticOnly = syntheticOnly;
        _thisClick.vastClickState.probeSource = source || '';
        _thisClick.vastClickState.generatedFallback = (source == 'generated' || source == 'generated_next');
        _thisClick.vastClickState.progressNotBefore = 0;
        _thisClick.vastClickState.armedAt = Date.now();
        _thisClick.vastClickState.seenAdPlayback = false;
        _thisClick.vastClickState.lastVideoTime = -1;
        _thisClick.vastClickState.lastVideoSrc = '';
        _thisClick.vastClickState.adGoneSince = 0;
        _thisClick.vastClickState.activeUntil = Date.now() + 70000;
        try {
          if (_thisClick.vastClickState.stopTimer) clearTimeout(_thisClick.vastClickState.stopTimer);
          _thisClick.vastClickState.stopTimer = setTimeout(function() {
            _thisClick.stopClientVastClick();
          }, 70000);
        } catch (ignore) {}

        debug('armed', 'sid=' + (probeSid || '') + ';idx=' + _thisClick.vastClickState.currentProbeIndex + ';p1=' + (!!p1) + ';p15=' + (!!p15) + ';dur=' + dur + ';off=' + (p15o || 15) + ';src=' + (source || ''));

        clearActiveProbeEndGuard();
        ensureProgressTracking();
        ensureOverlay();

        if (!_thisClick.vastClickState.timer) {
          _thisClick.vastClickState.timer = setInterval(ensureOverlay, 500);
        }

        if (syntheticOnly && !_thisClick.vastClickState.syntheticRunning) {
          rememberSyntheticTimer(setTimeout(function() {
            fireSyntheticProbe(url, _thisClick.vastClickState.currentProbeIndex, 'generated_next');
          }, 250));
        }

        return true;
      }

      function scanPerformance() {
        try {
          if (!window.performance || !performance.getEntriesByType) return;
          var entries = performance.getEntriesByType('resource') || [];
          for (var i = entries.length - 1; i >= 0; i--) {
            try { if (window.__gmtlop_kodik_maybe_send_stats_for_resource_entry) window.__gmtlop_kodik_maybe_send_stats_for_resource_entry(entries[i], 'perf_scan'); } catch (ignoreKodikResScan) {}
            if (acceptProbeUrl(entries[i].name || '', 'perf')) break;
          }
        } catch (e) {}
      }

      function probeUrlBySid(sid) {
        sid = String(sid || '');
        if (!sid) return '';
        try {
          var list = element.__veoveo_probe_urls || [];
          for (var i = 0; i < list.length; i++) {
            if (getProbeSid(list[i]) == sid) return list[i] || '';
          }
        } catch (e) {}
        return '';
      }


      try {
        if (window.PerformanceObserver) {
          var obs = new PerformanceObserver(function(list) {
            var entries = list.getEntries ? list.getEntries() : [];
            for (var i = 0; i < entries.length; i++) {
              try { if (window.__gmtlop_kodik_maybe_send_stats_for_resource_entry) window.__gmtlop_kodik_maybe_send_stats_for_resource_entry(entries[i], 'perf_observer'); } catch (ignoreKodikResObs) {}
              acceptProbeUrl(entries[i].name || '', 'perf');
            }
          });
          obs.observe({ entryTypes: ['resource'] });
          _thisClick.vastClickState.observer = obs;
        }
      } catch (e) {}


      // Do NOT poll a server state endpoint here. It creates an endless client heartbeat
      // and can break tracking/counting. Use PerformanceObserver when available, with a
      // guarded generated probe fallback for TV/WebView builds that hide resource entries.
      // If another provider already played VAST in this page/player session, Lampa can
      // silently refuse the second provider's preroll. In that case generated fallback
      // would create a false click overlay over the movie/source. Let only a real
      // /media-probe PerformanceObserver hit arm VeoVeo after a different provider.
      if (allowGeneratedFallbackForProvider('veoveo')) {
        if (element.__veoveo_probe_urls && element.__veoveo_probe_urls.length) {
          acceptProbeUrl(element.__veoveo_probe_urls[0], 'generated');
        } else if (element.__veoveo_probe_url) {
          acceptProbeUrl(element.__veoveo_probe_url, 'generated');
        }
      } else {
        debug('generated_blocked_after_provider', getGlobalClientVastPlaybackProvider());
      }

      scanPerformance();
      _thisClick.vastClickState.timer = setInterval(function() {
        scanPerformance();
        ensureProgressTracking();
        ensureOverlay();
      }, 1000);

      if (!_thisClick.vastClickState.stopTimer) {
        _thisClick.vastClickState.stopTimer = setTimeout(function() {
          _thisClick.stopClientVastClick();
        }, 70000);
      }
    };

    this.prepareClientVast = function(element, done) {
      var _thisClient = this;
      var finished = false;

      function prepDebug(ev, extra) {
        try {
          var enabled = false;
          try {
            enabled = window.__veoveo_vast_debug === true ||
              window.__veoveo_vast_debug === '1' ||
              localStorage.getItem('veoveo_vast_debug') == '1';
          } catch (ignoreDbg) {}
          if (!enabled) return;

          var base = element.__veoveo_client_debug_base || '';
          if (!base) return;
          var url = base + (base.indexOf('?') >= 0 ? '&' : '?') +
            'sid=' + encodeURIComponent(element.__veoveo_client_sid || '') +
            '&ev=' + encodeURIComponent(ev || '') +
            '&t=' + Date.now();
          if (extra) url += '&x=' + encodeURIComponent(String(extra).slice(0, 500));
          (new Image()).src = url;
        } catch (e) {}
      }

      var kodikLoadingActive = false;

      function kodikLoadingStart() {
        if (kodikLoadingActive) return;
        kodikLoadingActive = true;
        try {
          if (window.Lampa && Lampa.Loading && typeof Lampa.Loading.start == 'function')
            Lampa.Loading.start();
        } catch (e) {}
      }

      function kodikLoadingStop() {
        if (!kodikLoadingActive) return;
        kodikLoadingActive = false;
        try {
          if (window.Lampa && Lampa.Loading && typeof Lampa.Loading.stop == 'function')
            Lampa.Loading.stop();
        } catch (e) {}
      }

      function finish() {
        if (finished) return;
        finished = true;
        try { kodikLoadingStop(); } catch (ignoreKodikLoadingStop) {}
        try { done(); } catch (e) {}
      }

      if (!element || !element.vast_url)
        return finish();

      var clientVastProvider = '';
      if (element.vast_url.indexOf('/lite/veoveo/vast-client') != -1) clientVastProvider = 'veoveo';
      if (element.vast_url.indexOf('/lite/vibix/vast-client') != -1) clientVastProvider = 'vibix';
      if (element.vast_url.indexOf('/lite/kodik/vast-client') != -1) clientVastProvider = 'kodik';
      if (!clientVastProvider)
        return finish();

      element.__veoveo_probe_urls = [];
      element.__veoveo_probe_url = '';

      function appendParam(url, name, value) {
        if (!url) return url;
        return url + (url.indexOf('?') >= 0 ? '&' : '?') + encodeURIComponent(name) + '=' + encodeURIComponent(value == null ? '' : String(value));
      }

      function addCacheBust(url) {
        return appendParam(url, '_', Date.now());
      }

      function vastTimeToSeconds(value) {
        if (!value) return 0;
        value = String(value).trim();
        var parts = value.split(':');
        var sec = 0;
        if (parts.length == 3) {
          sec = (Number(parts[0]) || 0) * 3600 + (Number(parts[1]) || 0) * 60 + (Number(parts[2]) || 0);
        } else if (parts.length == 2) {
          sec = (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
        } else {
          sec = Number(value) || 0;
        }
        return isFinite(sec) && sec > 0 ? sec : 0;
      }

      function b64url(str) {
        try {
          var utf8 = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(m, p1) {
            return String.fromCharCode(parseInt(p1, 16));
          });
          return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        } catch (e) {
          try { return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); } catch (ignore) {}
        }
        return '';
      }

      function nativeText(url, headers, label, opts) {
        return new Promise(function(resolve, reject) {
          opts = opts || {};
          label = label || 'native_text';

          try {
            if (!Lampa || !Lampa.Reguest) throw new Error('no Lampa.Reguest');
            var r = new Lampa.Reguest();
            if (!r || typeof r.native != 'function') throw new Error('no Reguest.native');

            var timeout = opts.timeout || 15000;
            if (r.timeout) r.timeout(timeout);

            var done = false;
            var timer = setTimeout(function() {
              if (done) return;
              done = true;
              prepDebug(label + '_timeout', String(timeout));
              reject(new Error(label + ' native timeout'));
            }, timeout);

            var nativeOptions = {
              headers: headers || {},
              dataType: opts.dataType || 'text',
              timeout: timeout,
              cache: false
            };

            if (opts.method) {
              nativeOptions.method = opts.method;
              nativeOptions.type = opts.method;
            }

            var postData = opts.body != null ? opts.body : false;
            if (opts.body != null) {
              nativeOptions.body = opts.body;
              nativeOptions.data = opts.body;
              nativeOptions.post = true;
              nativeOptions.contentType = (headers && (headers['Content-Type'] || headers['content-type'])) || 'text/plain;charset=UTF-8';
            }

            prepDebug(label + '_start', 'method=' + (opts.method || (postData ? 'POST' : 'GET')) + ';headers=' + Object.keys(headers || {}).join(',').slice(0, 160));

            r.native(addCacheBust(url), function(data) {
              if (done) return;
              done = true;
              clearTimeout(timer);

              var text = '';
              try {
                if (typeof data == 'string') text = data;
                else if (data && typeof data.responseText == 'string') text = data.responseText;
                else if (data && typeof data.text == 'string') text = data.text;
                else if (data != null) text = JSON.stringify(data);
              } catch (ignore) {}

              prepDebug(label + '_ok', 'len=' + (text || '').length + ';head=' + String(text || '').slice(0, 80).replace(/\s+/g, ' '));
              resolve(text);
            }, function(err, xhr) {
              if (done) return;
              done = true;
              clearTimeout(timer);

              var status = '';
              try { status = (xhr && xhr.status) || (err && err.status) || ''; } catch (ignore) {}
              prepDebug(label + '_err', 'status=' + status + ';err=' + shortErr(err));
              reject(new Error(label + ' native fail ' + status));
            }, postData, nativeOptions);
          } catch (e) {
            prepDebug(label + '_throw', shortErr(e));
            reject(e);
          }
        });
      }


      function shortErr(e) {
        try {
          if (!e) return '';
          if (typeof e == 'string') return e;
          if (e.message) return e.message;
          return String(e);
        } catch (ignore) {}
        return '';
      }

      function methodKeys(obj) {
        var out = [];
        try {
          for (var k in obj) out.push(k);
          if (obj && obj.prototype) {
            Object.getOwnPropertyNames(obj.prototype).forEach(function(k) {
              if (out.indexOf(k) < 0) out.push(k);
            });
          }
        } catch (e) {}
        return out.slice(0, 40).join(',');
      }

      function lampaReguestText(url, headers) {
        return new Promise(function(resolve, reject) {
          try {
            prepDebug('native_keys', 'R=' + methodKeys(Lampa.Reguest).slice(0, 180) + ';N=' + methodKeys(Lampa.Network).slice(0, 180));

            if (!Lampa || !Lampa.Reguest) throw new Error('no Lampa.Reguest');
            var r = new Lampa.Reguest();
            if (r.timeout) r.timeout(15000);

            var asText = function asText(data) {
              if (typeof data == 'string') return data;
              if (data && typeof data == 'object') {
                if (typeof data.responseText == 'string') return data.responseText;
                if (typeof data.text == 'string') return data.text;
                try { return JSON.stringify(data); } catch (ignore) { return String(data); }
              }
              return String(data || '');
            };

            var finishOk = function finishOk(label, data) {
              var text = asText(data);
              prepDebug(label + '_ok', 'type=' + (typeof data) + ';len=' + text.length + ';vast=' + (text.indexOf('<VAST') >= 0));
              if (text.indexOf('<VAST') < 0) {
                reject(new Error(label + ' bad response: ' + text.slice(0, 120)));
                return;
              }
              resolve(text);
            };

            var finishErr = function finishErr(label, err, xhr) {
              var status = '';
              try { status = (xhr && xhr.status) || (err && err.status) || ''; } catch (ignore) {}
              prepDebug(label + '_err', 'status=' + status + ';err=' + shortErr(err));
              reject(new Error(label + ' fail ' + status));
            };

            var callNative = function callNative() {
              if (!r.native) throw new Error('no Reguest.native');
              prepDebug('native_start', 'headers=' + Object.keys(headers || {}).join(',').slice(0, 180));
              var done = false;
              var timer = setTimeout(function() {
                if (done) return;
                done = true;
                prepDebug('native_timeout', '15000');
                reject(new Error('native timeout'));
              }, 15000);

              r.native(addCacheBust(url), function(data) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                finishOk('native', data);
              }, function(err, xhr) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                finishErr('native', err, xhr);
              }, false, {
                headers: headers || {},
                dataType: 'text',
                timeout: 15000,
                cache: false
              });
            };

            callNative();
          } catch (e) {
            prepDebug('native_throw', shortErr(e));
            reject(e);
          }
        });
      }


      function lampaNativeAny(url, headers, label, opts) {
        return new Promise(function(resolve) {
          opts = opts || {};
          label = label || 'native_any';

          try {
            if (!Lampa || !Lampa.Reguest) {
              prepDebug(label + '_skip', 'no_reguest');
              resolve(false);
              return;
            }

            var r = new Lampa.Reguest();
            if (!r || typeof r.native != 'function') {
              prepDebug(label + '_skip', 'no_native');
              resolve(false);
              return;
            }

            if (r.timeout) r.timeout(opts.timeout || 8000);

            var done = false;
            var timer = setTimeout(function() {
              if (done) return;
              done = true;
              prepDebug(label + '_timeout', String(opts.timeout || 8000));
              resolve(false);
            }, opts.timeout || 8000);

            var nativeOptions = {
              headers: headers || {},
              dataType: opts.dataType || 'text',
              timeout: opts.timeout || 8000,
              cache: false
            };

            if (opts.method) {
              nativeOptions.method = opts.method;
              nativeOptions.type = opts.method;
            }

            if (opts.body != null) {
              nativeOptions.body = opts.body;
              nativeOptions.data = opts.body;
              nativeOptions.post = true;
              nativeOptions.contentType = (headers && (headers['Content-Type'] || headers['content-type'])) || 'application/json;charset=UTF-8';
            }

            var postData = opts.body != null ? opts.body : false;
            prepDebug(label + '_start', 'method=' + (opts.method || (postData ? 'POST' : 'GET')) + ';post=' + (!!postData) + ';headers=' + Object.keys(headers || {}).join(',').slice(0, 160));

            r.native(addCacheBust(url), function(data) {
              if (done) return;
              done = true;
              clearTimeout(timer);

              var text = '';
              try {
                if (typeof data == 'string') text = data;
                else if (data && typeof data.responseText == 'string') text = data.responseText;
                else if (data && typeof data.text == 'string') text = data.text;
                else if (data != null) text = JSON.stringify(data);
              } catch (ignore) {}

              prepDebug(label + '_ok', 'len=' + (text || '').length + ';head=' + String(text || '').slice(0, 80).replace(/\s+/g, ' '));
              resolve(true);
            }, function(err, xhr) {
              if (done) return;
              done = true;
              clearTimeout(timer);

              var status = '';
              try { status = (xhr && xhr.status) || (err && err.status) || ''; } catch (ignore) {}
              prepDebug(label + '_err', 'status=' + status + ';err=' + shortErr(err));
              resolve(false);
            }, postData, nativeOptions);
          } catch (e) {
            prepDebug(label + '_throw', shortErr(e));
            resolve(false);
          }
        });
      }

      function getStringVar(html, name) {
        try {
          var re = new RegExp('window\\.' + name + '\\s*=\\s*[\\"\\\']([^\\"\\\']*)[\\"\\\']', 'i');
          var m = re.exec(html || '');
          return m ? String(m[1] || '') : '';
        } catch (e) {
          return '';
        }
      }

      function randomHex(len) {
        var out = '';
        var chars = '0123456789abcdef';
        try {
          var arr = new Uint8Array(Math.ceil((len || 32) / 2));
          if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(arr);
          for (var i = 0; i < arr.length; i++) out += ('0' + arr[i].toString(16)).slice(-2);
          return out.slice(0, len || 32);
        } catch (e) {}

        for (var j = 0; j < (len || 32); j++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
      }

      function getOrCreateDeviceFp() {
        var key = 'veoveo_device_fp';
        try {
          var value = localStorage.getItem(key);
          if (value && /^[a-f0-9]{24,64}$/i.test(value)) return value;
          value = randomHex(32);
          localStorage.setItem(key, value);
          return value;
        } catch (e) {
          return randomHex(32);
        }
      }

      function ensureIframeLikeContextHeaders(reqHeaders) {
        reqHeaders = reqHeaders || {};

        var fp = getOrCreateDeviceFp();
        if (reqHeaders['DLE-API-TOKEN']) reqHeaders['X-Has-Token'] = 'true';
        if (!reqHeaders['CDC-FRIENDLY']) reqHeaders['CDC-FRIENDLY'] = 'false';
        if (!reqHeaders['X-Session-Context']) reqHeaders['X-Session-Context'] = fp;
        if (!reqHeaders['Cookie']) reqHeaders['Cookie'] = 'device_fp=' + fp;
        else if (String(reqHeaders['Cookie']).indexOf('device_fp=') < 0) reqHeaders['Cookie'] += '; device_fp=' + fp;

        if (!reqHeaders['X-Ancestor-Origin']) reqHeaders['X-Ancestor-Origin'] = location.origin || '';
        if (!reqHeaders['X-Parent-Referrer']) reqHeaders['X-Parent-Referrer'] = document.referrer || '';

        return reqHeaders;
      }

      function cloneHeaders(src) {
        var out = {};
        try {
          Object.keys(src || {}).forEach(function(k) { out[k] = src[k]; });
        } catch (e) {}
        return out;
      }

      function uuidLike() {
        try {
          if (window.crypto && typeof window.crypto.randomUUID == 'function') return window.crypto.randomUUID();
        } catch (e) {}
        var h = randomHex(32);
        return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
      }

      function veoveoIframeContextBoost(html, reqHeaders, info) {
        reqHeaders = ensureIframeLikeContextHeaders(reqHeaders || {});

        var adListUrl = getStringVar(html, 'AD_LIST_URL');
        var analyticsUrl = getStringVar(html, 'ANALYTICS_URL');
        var envBase = getStringVar(html, 'ENV_BASE_URL');

        prepDebug('ctx_found', 'adlist=' + (!!adListUrl) + ';analytics=' + (!!analyticsUrl) + ';env=' + (!!envBase) + ';sess=' + (!!reqHeaders['X-Session-Context']) + ';cookie=' + (!!reqHeaders['Cookie']));

        var jobs = [];

        if (adListUrl) {
          jobs.push(lampaNativeAny(adListUrl, reqHeaders, 'ctx_adlist', {
            method: 'GET',
            timeout: 6000,
            dataType: 'text'
          }));
        }

        if (analyticsUrl) {
          var metricsHeaders = cloneHeaders(reqHeaders);
          metricsHeaders['Content-Type'] = 'application/json;charset=UTF-8';

          var body = JSON.stringify({
            eventType: 'IFRAME_LOADED',
            eventId: uuidLike(),
            timestamp: Date.now(),
            contentId: info && info.movieid != null ? String(info.movieid) : undefined
          });

          jobs.push(lampaNativeAny(analyticsUrl, metricsHeaders, 'ctx_iframe_loaded', {
            method: 'POST',
            body: body,
            timeout: 6000,
            dataType: 'text'
          }));
        }

        if (!jobs.length) return Promise.resolve(false);

        return new Promise(function(resolve) {
          var done = false;
          var timer = setTimeout(function() {
            if (done) return;
            done = true;
            prepDebug('ctx_done', 'timeout');
            resolve(true);
          }, 1500);

          Promise.all(jobs).then(function(res) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            prepDebug('ctx_done', 'res=' + res.join(','));
            resolve(true);
          }).catch(function(e) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            prepDebug('ctx_done', 'err=' + shortErr(e));
            resolve(true);
          });
        });
      }

      function getObjectLiteral(html, name) {
        var re = new RegExp('window\\.' + name + '\\s*=\\s*(\\{[\\s\\S]*?\\});window\\.', 'i');
        var m = re.exec(html || '');
        if (!m) {
          re = new RegExp('window\\.' + name + '\\s*=\\s*(\\{[\\s\\S]*?\\});', 'i');
          m = re.exec(html || '');
        }
        return m ? m[1] : '';
      }

      function parseRequestHeaders(html) {
        var src = getObjectLiteral(html, 'REQUEST_HEADERS');
        if (!src) return {};
        try { return (new Function('return (' + src + ');'))() || {}; } catch (e) { return {}; }
      }

      function parseAdJson(html) {
        var src = getObjectLiteral(html, 'INITIAL_AD_LIST_JSON');
        if (!src) return null;
        try { return JSON.parse(src); } catch (e) {}
        try { return (new Function('return (' + src + ');'))(); } catch (e) {}
        return null;
      }

      function extractNode(xml, tag) {
        var re = new RegExp('<' + tag + '[^>]*>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</' + tag + '>', 'i');
        var m = re.exec(xml || '');
        return m ? String(m[1] || '').trim() : '';
      }

      function extractMedia(xml) {
        var re = /<MediaFile\b[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/MediaFile>/i;
        var m = re.exec(xml || '');
        return m ? String(m[1] || '').trim() : '';
      }

      function extractDuration(xml) {
        var m = /<Duration\b[^>]*>\s*([\s\S]*?)\s*<\/Duration>/i.exec(xml || '');
        return m ? String(m[1] || '').trim() : '';
      }

      function extractTrackingOffset(xml, eventName, targetUrl) {
        var re = /<Tracking\b([^>]*)>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/Tracking>/ig;
        var m;
        while ((m = re.exec(xml || ''))) {
          var attrs = m[1] || '';
          var url = String(m[2] || '').trim();
          if (eventName && !new RegExp("event=[\\\"']" + eventName + "[\\\"']", 'i').test(attrs)) continue;
          if (targetUrl && url !== targetUrl) continue;
          var om = /offset=["']([^"']+)["']/i.exec(attrs);
          return om ? om[1] : '';
        }
        return '';
      }

      function extractTracking(xml, eventName, offset) {
        var re = /<Tracking\b([^>]*)>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/Tracking>/ig;
        var m;
        while ((m = re.exec(xml || ''))) {
          var attrs = m[1] || '';
          if (eventName && !new RegExp("event=[\"']" + eventName + "[\"']", 'i').test(attrs)) continue;
          if (offset && !new RegExp("offset=[\"']" + offset.replace(/:/g, '\\:') + "[\"']", 'i').test(attrs)) continue;
          return String(m[2] || '').trim();
        }
        return '';
      }


      function extractTrackingByUrl(xml, eventName, pattern) {
        var re = /<Tracking\b([^>]*)>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/Tracking>/ig;
        var m;
        while ((m = re.exec(xml || ''))) {
          var attrs = m[1] || '';
          var url = String(m[2] || '').trim();
          if (eventName && !new RegExp("event=[\\\"']" + eventName + "[\\\"']", 'i').test(attrs)) continue;
          if (pattern && !pattern.test(url)) continue;
          return url;
        }
        return '';
      }

      function extractBestProgressStats(xml) {
        // VeoVeo can emit short regional ads where the player/stats marker is offset 00:00:14
        // instead of 00:00:15. Do not hardcode the offset; identify the stats URL itself.
        var url = extractTrackingByUrl(xml, 'progress', /\/api-integration\/player\/stats/i);
        if (url) return url;

        // Fallback: choose the progress tracking URL with the largest offset that is not the 1s ad-rotator ping.
        var re = /<Tracking\b([^>]*)>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/Tracking>/ig;
        var m;
        var bestUrl = '';
        var bestSec = 0;
        while ((m = re.exec(xml || ''))) {
          var attrs = m[1] || '';
          var candidate = String(m[2] || '').trim();
          if (!/event=["']progress["']/i.test(attrs)) continue;
          if (/ad-rotator\/track\/progress/i.test(candidate)) continue;
          var om = /offset=["']([^"']+)["']/i.exec(attrs);
          var sec = om ? vastTimeToSeconds(om[1]) : 0;
          if (sec >= bestSec) {
            bestSec = sec;
            bestUrl = candidate;
          }
        }
        if (bestUrl) return bestUrl;

        // Vibix VAST uses quartile/complete events instead of progress offsets.
        // Use complete as the final marker so the invisible click layer is removed
        // around the ad end instead of staying over the main player controls.
        url = extractTracking(xml, 'complete', null);
        if (url) return url;

        return '';
      }

      function extractAds(xml) {
        var out = [];
        var re = /<Ad\b[\s\S]*?<\/Ad>/ig;
        var m;
        while ((m = re.exec(xml || ''))) {
          out.push(m[0]);
        }
        return out;
      }

      function mergeVastPod(xmlList, provider) {
        provider = provider || clientVastProvider || 'veoveo';
        xmlList = (xmlList || []).filter(function(x) { return x && String(x).indexOf('<VAST') >= 0; });

        // Keep the original VeoVeo pod behavior byte-for-byte in spirit:
        // VAST 4.2, veoveo-ad-* ids, and all ads from all returned XMLs.
        // Vibix has its own sanitized path below because its raw VAST can contain wrappers
        // and Kinescope redirect-like media URLs that Lampa skips.
        if (provider != 'vibix') {
          if (xmlList.length <= 1) return xmlList[0] || '';

          var veoveoAds = [];
          for (var vi = 0; vi < xmlList.length; vi++) {
            var veoveoParts = extractAds(xmlList[vi]);
            for (var vj = 0; vj < veoveoParts.length; vj++) {
              var vad = veoveoParts[vj];
              vad = vad.replace(/^<Ad\b([^>]*)>/i, function(all, attrs) {
                attrs = attrs || '';
                attrs = attrs.replace(/\ssequence=(['"]).*?\1/i, '');
                attrs = attrs.replace(/\sid=(['"]).*?\1/i, '');
                var seq = provider == 'kodik' ? (veoveoAds.length + 1) : (vi + 1);
                var prefix = provider == 'kodik' ? 'kodik-ad-' : 'veoveo-ad-';
                return '<Ad id="' + prefix + seq + '" sequence="' + seq + '"' + attrs + '>';
              });
              veoveoAds.push(vad);
            }
          }

          if (!veoveoAds.length) return xmlList[0] || '';
          return '<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="4.2">\n' + veoveoAds.join('\n') + '\n</VAST>';
        }

        var ads = [];
        for (var i = 0; i < xmlList.length; i++) {
          var parts = extractAds(xmlList[i]);

          // Vibix VAST usually contains Wrapper ads and multiple InLine alternatives.
          // Lampa can get stuck on wrappers / duplicated id+sequence. Keep one playable
          // InLine ad per requested pod and renumber everything globally.
          var playable = [];
          for (var pj = 0; pj < parts.length; pj++) {
            if (/<InLine\b/i.test(parts[pj]) && /<MediaFile\b/i.test(parts[pj]))
              playable.push(parts[pj]);
          }
          parts = playable.length ? [playable[0]] : [];

          for (var j = 0; j < parts.length; j++) {
            var ad = parts[j];
            var seq = ads.length + 1;
            ad = ad.replace(/^<Ad\b([^>]*)>/i, function(all, attrs) {
              attrs = attrs || '';
              attrs = attrs.replace(/\ssequence=(['"]).*?\1/i, '');
              attrs = attrs.replace(/\sid=(['"]).*?\1/i, '');
              return '<Ad id="vibix-ad-' + seq + '" sequence="' + seq + '"' + attrs + '>';
            });
            ads.push(ad);
          }
        }

        if (!ads.length) {
          try { prepDebug('vibix_final_pod_empty', 'xmls=' + xmlList.length); } catch (ignoreEmptyDbg) {}
          return '';
        }
        return '<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="3.0">\n' + ads.join('\n') + '\n</VAST>';
      }

      function vibixIsAndroidClient() {
        try {
          if (typeof Lampa != 'undefined' && Lampa.Platform && typeof Lampa.Platform.is == 'function' && Lampa.Platform.is('android')) return true;
        } catch (ignorePlatform) {}
        try { return /Android/i.test(String(navigator && navigator.userAgent || '')); } catch (ignoreUa) {}
        return false;
      }

      function sanitizeVibixPlayableVast(xml, info) {
        return buildVibixVastPod([xml], info, { onePerXml: false, label: 'single' });
      }

      function buildVibixVastPod(xmlList, info, opts) {
        opts = opts || {};
        xmlList = (xmlList || []).filter(function(x) { return x && String(x).indexOf('<VAST') >= 0; });
        var ads = [];
        var onePerXml = opts.onePerXml !== false;

        function firstCdataOrText(body) {
          body = String(body || '');
          var m = /<!\[CDATA\[([\s\S]*?)\]\]>/i.exec(body);
          if (m) return String(m[1] || '').trim();
          return body.replace(/<[^>]+>/g, '').trim();
        }

        function chooseVibixMedia(block) {
          var firstHttp = '';
          var firstMp4 = '';
          var firstEmbed = '';
          var re = /<MediaFile\b([^>]*)>([\s\S]*?)<\/MediaFile>/ig;
          var m;

          while ((m = re.exec(String(block || '')))) {
            var url = firstCdataOrText(m[2]);
            if (!url || !/^https?:\/\//i.test(url)) continue;

            // This is the old working chain: let /lite/vibix/ad.mp4 resolve the
            // Kinescope/embed URL via 302. Do not expose direct CDN candidates first
            // and do not keep multiple candidates on Android/Lampa.
            if (!firstHttp) firstHttp = url;
            if (!firstEmbed && /kinescope\.io\/embed\//i.test(url)) firstEmbed = url;
            if (!firstMp4 && (/kinescopecdn\.net\/.+\/mp4\//i.test(url) || /\.(mp4|m4v)(\?|#|$)/i.test(url))) firstMp4 = url;
          }

          return firstEmbed || firstMp4 || firstHttp || '';
        }

        function adMediaChoice(ad) {
          var m = /<MediaFiles\b[^>]*>[\s\S]*?<\/MediaFiles>/i.exec(String(ad || ''));
          return m ? chooseVibixMedia(m[0]) : '';
        }

        function rewriteVibixMediaFiles(ad, adIndex) {
          return String(ad || '').replace(/<MediaFiles\b[^>]*>[\s\S]*?<\/MediaFiles>/i, function(block) {
            var mediaUrl = chooseVibixMedia(block);
            if (!mediaUrl) return block;

            var out = mediaUrl;
            if (info && info.adMediaBase && /^https?:\/\//i.test(mediaUrl)) {
              out = appendParam(info.adMediaBase, 'next', b64url(mediaUrl));
              if (info.sid) out = appendParam(out, 'sid', info.sid + '_ad' + (adIndex || 1));
              out = appendParam(out, '_v', Date.now());
            }

            // Keep this as a single plain progressive mp4-looking MediaFile. The
            // real file is still reached through /lite/vibix/ad.mp4 -> 302.
            return '<MediaFiles><MediaFile delivery="progressive" type="video/mp4" width="1280" height="720" maintainAspectRatio="true" scalable="true"><![CDATA[' + out + ']]></MediaFile></MediaFiles>';
          });
        }

        function normalizeVibixAd(ad, seq) {
          ad = rewriteVibixMediaFiles(ad, seq);
          if (!/<MediaFile\b/i.test(ad)) return '';

          // Do not rewrite UniversalAdId / Creative / AdServingId. Android appears
          // to be sensitive to malformed/over-normalized Vibix VAST identity blocks.
          // Only make outer Ad id/sequence deterministic; tracking URLs stay intact.
          ad = ad.replace(/^<Ad\b([^>]*)>/i, function(all, attrs) {
            attrs = attrs || '';
            attrs = attrs.replace(/\ssequence=(["']).*?\1/i, '');
            attrs = attrs.replace(/\sid=(["']).*?\1/i, '');
            return '<Ad id="vibix-ad-' + seq + '" sequence="' + seq + '"' + attrs + '>';
          });

          return ad;
        }

        for (var xi = 0; xi < xmlList.length; xi++) {
          var parts = extractAds(xmlList[xi]);
          var candidates = [];

          for (var pi = 0; pi < parts.length; pi++) {
            var part = parts[pi];
            if (!/<InLine\b/i.test(part) || !/<MediaFile\b/i.test(part)) continue;
            if (!adMediaChoice(part)) continue;
            candidates.push(part);
          }

          var take = onePerXml ? Math.min(1, candidates.length) : candidates.length;
          for (var ci = 0; ci < take; ci++) {
            var seq = ads.length + 1;
            var normalized = normalizeVibixAd(candidates[ci], seq);
            if (normalized) {
              try {
                prepDebug('vibix_final_ad', 'ad=' + seq + ';mf=1;dur=' + (vastTimeToSeconds(extractDuration(normalized)) || 0) + ';start=' + (!!extractTracking(normalized, 'start', null)) + ';complete=' + (!!extractTracking(normalized, 'complete', null)) + ';click=' + (!!extractNode(normalized, 'ClickThrough')) + ';media=' + (extractMedia(normalized) || '').replace(/^https?:\/\//i, '').slice(0, 110));
              } catch (ignoreAdDbg) {}
              ads.push(normalized);
            }
          }
        }

        if (!ads.length) return xmlList[0] || '';

        try {
          var mediaDbg = [];
          for (var mi = 0; mi < ads.length; mi++) {
            var mu = extractMedia(ads[mi]) || '';
            mediaDbg.push((mi + 1) + ':' + mu.replace(/^https?:\/\//i, '').slice(0, 110));
          }
          prepDebug('vibix_final_pod', 'count=' + ads.length + ';onePerXml=' + onePerXml + ';media=' + mediaDbg.join(' | '));
        } catch (ignoreDbg) {}

        return '<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="3.0">\n' + ads.join('\n') + '\n</VAST>';
      }

      function extractVibixClickInfo(xml) {
        xml = String(xml || '');
        var info = { ct: '', ck: '', dur: 0, media: '', q: '', a: '', pp: '' };
        try { info.ct = extractNode(xml, 'ClickThrough') || ''; } catch (ignoreCt) {}
        try { info.ck = extractNode(xml, 'ClickTracking') || ''; } catch (ignoreCk) {}
        try { info.dur = vastTimeToSeconds(extractDuration(xml)) || 0; } catch (ignoreDur) {}
        try { info.media = extractMedia(xml) || ''; } catch (ignoreMedia) {}
        try {
          var marker = info.ck || extractTracking(xml, 'start', null) || extractNode(xml, 'Impression') || '';
          info.q = getUrlParamLite(marker, 'q');
          info.a = getUrlParamLite(marker, 'a');
          info.pp = getUrlParamLite(marker, 'pp');
        } catch (ignoreKey) {}
        return info;
      }

      function getUrlParamLite(url, name) {
        try {
          var re = new RegExp('[?&]' + name + '=([^&#]*)', 'i');
          var m = re.exec(String(url || ''));
          return m ? decodeURIComponent((m[1] || '').replace(/\+/g, ' ')) : '';
        } catch (e) {
          return '';
        }
      }

      function extractVibixClickInfos(xml) {
        var out = [];
        try {
          var parts = extractAds(xml);
          for (var i = 0; i < parts.length; i++) {
            var item = extractVibixClickInfo(parts[i]);
            if (!item || !item.ct) continue;
            out.push(item);
          }
        } catch (e) {}

        if (!out.length) {
          var one = extractVibixClickInfo(xml);
          if (one && one.ct) out.push(one);
        }

        return out;
      }

      function addDirtyProbe(xml, info) {
        // Kodik often returns pure VPAID/Wrapper ads. Never turn those JS wrappers
        // into fake video/mp4 media-probe entries: Lampa will play an empty block
        // and keep re-requesting the stored VAST. Only probe Kodik ads that already
        // contain a normal video MediaFile.
        try {
          if (clientVastProvider == 'kodik' && !kodikHasPlayableVideoMedia(xml))
            return String(xml || '');
        } catch (ignoreKodikProbe) {}

        var media = extractMedia(xml);
        if (!media || !info || !info.mediaProbeBase) return xml;

        var probe = info.mediaProbeBase;
        probe = appendParam(probe, 'movieid', info.movieid || '');
        probe = appendParam(probe, 'sid', info.sid || '');
        probe = appendParam(probe, 'next', b64url(media));

        if (info.s && Number(info.s) > 0) probe = appendParam(probe, 's', info.s);
        if (info.e && Number(info.e) > 0) probe = appendParam(probe, 'e', info.e);

        var ct = extractNode(xml, 'ClickThrough');
        var ck = extractNode(xml, 'ClickTracking');
        var st = extractTracking(xml, 'start', null);
        var p1 = extractTrackingByUrl(xml, 'progress', /ad-rotator\/track\/progress/i) || extractTracking(xml, 'progress', '00:00:01');
        var p15 = extractBestProgressStats(xml);
        var durationText = extractDuration(xml);
        var p15OffsetText = extractTrackingOffset(xml, 'progress', p15);
        var durationSec = vastTimeToSeconds(durationText);
        var p15OffsetSec = vastTimeToSeconds(p15OffsetText) || durationSec || 15;

        if (durationSec) probe = appendParam(probe, 'dur', durationSec);
        if (p15OffsetSec) probe = appendParam(probe, 'p15o', p15OffsetSec);

        if (ct) probe = appendParam(probe, 'ct', b64url(ct));
        if (ck) probe = appendParam(probe, 'ck', b64url(ck));
        if (st) probe = appendParam(probe, 'st', b64url(st));
        if (p1) probe = appendParam(probe, 'p1', b64url(p1));
        if (p15) probe = appendParam(probe, 'p15', b64url(p15));

        // Smart-TV/WebView may not expose media resource URLs through PerformanceObserver.
        // Store generated probe URLs. For ad pods keep the FIRST probe as explicit fallback,
        // while PerformanceObserver can re-arm later ads when their media-probe is requested.
        try {
          element.__veoveo_probe_urls = element.__veoveo_probe_urls || [];
          element.__veoveo_probe_urls.push(probe);
          if (!element.__veoveo_probe_url) element.__veoveo_probe_url = probe;
        } catch (ignore) {
          if (!element.__veoveo_probe_url) element.__veoveo_probe_url = probe;
        }

        // For VeoVeo we insert a dirty MediaFile so Lampa's real media request arms
        // the click/tracking layer. Vibix media URLs are Kinescope embed-like links;
        // inserting the probe as the first playable MediaFile can make Lampa try the
        // probe/redirect and never play the real ad. For Vibix we keep original
        // MediaFiles untouched and use generated probe URLs only for JS tracking.
        if (info && info.probeAsMediaFile === false)
          return String(xml || '');

        var mf = '\n                                <MediaFile delivery="progressive" type="video/mp4" width="640" height="360" codec="H.264"><![CDATA[' + probe + ']]></MediaFile>';
        return String(xml || '').replace(/(<MediaFiles[^>]*>)/i, function(all) { return all + mf; });
      }

      function addDirtyProbeToPod(xml, info) {
        var adRe = /<Ad\b[\s\S]*?<\/Ad>/ig;
        var count = 0;
        var out = String(xml || '').replace(adRe, function(ad) {
          count++;
          var adInfo = {};
          for (var k in (info || {})) adInfo[k] = info[k];
          adInfo.sid = (info && info.sid ? String(info.sid) : '') + '_ad' + count;
          return addDirtyProbe(ad, adInfo);
        });

        if (count > 0) {
          prepDebug('pod_probe_built', 'count=' + count);
          return out;
        }

        return addDirtyProbe(xml, info);
      }

      function setVastBlob(xml) {
        try {
          var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
          element.vast_url = URL.createObjectURL(blob);
          element.__veoveo_client_vast = true;
          if (clientVastProvider == 'vibix') element.__vibix_client_vast = true;
          if (clientVastProvider == 'kodik') element.__kodik_client_vast = true;
          return true;
        } catch (e) {}

        try {
          element.vast_url = 'data:application/xml;charset=utf-8,' + encodeURIComponent(xml);
          element.__veoveo_client_vast = true;
          if (clientVastProvider == 'vibix') element.__vibix_client_vast = true;
          if (clientVastProvider == 'kodik') element.__kodik_client_vast = true;
          return true;
        } catch (e) {}

        return false;
      }

      function fallback(info, reason) {
        try { delete element.vast_url; } catch (e) { element.vast_url = ''; }
        element.vast_url = '';
        element.__veoveo_client_vast = false;
        element.__vibix_client_vast = false;
        element.__kodik_client_vast = false;
        element.__veoveo_client_vast_failed = true;
        if (clientVastProvider == 'kodik') element.__kodik_client_vast_failed = true;
        finish();
      }

      function hasLampaPremium() {
        try {
          if (Lampa && Lampa.Account && typeof Lampa.Account.hasPremium == 'function' && Lampa.Account.hasPremium())
            return true;
        } catch (e) {}
        return false;
      }

      // Policy-safe: do not prepare our plugin VAST for Lampa premium users.
      // We only remove Lampac plugin VAST here; Lampa's own preroll logic remains untouched.
      if (hasLampaPremium()) {
        try { prepDebug('premium_skip', clientVastProvider); } catch (ignorePremiumDebug) {}
        fallback(null, 'lampa premium');
        return;
      }


      function vibixHasPlayableMedia(xml) {
        xml = String(xml || '');
        var re = /<MediaFile\b([^>]*)>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/MediaFile>/ig;
        var m;
        while ((m = re.exec(xml))) {
          var attrs = String(m[1] || '');
          var media = String(m[2] || '').trim();
          if (!/^https?:\/\//i.test(media)) continue;
          if (/apiFramework=["']?VPAID/i.test(attrs)) continue;
          if (/javascript|vpaid/i.test(attrs)) continue;
          return true;
        }
        return false;
      }

      function vibixHasAd(xml) {
        xml = String(xml || '');
        if (xml.indexOf('<VAST') < 0) return false;
        if (!/<Ad[\s>]/i.test(xml)) return false;
        if (/<VAST[^>]*>\s*<\/VAST>/i.test(xml)) return false;
        // Vibix can return Wrapper ads before real InLine ads. Lampa may hang on
        // wrappers without a playable MediaFile, so Vibix is considered usable
        // only when at least one InLine video media candidate exists.
        if (!/<InLine\b/i.test(xml)) return false;
        if (!vibixHasPlayableMedia(xml)) return false;
        return true;
      }

      function vibixGetFp() {
        var key = 'vibix_device_fp';
        try {
          var value = localStorage.getItem(key);
          if (value && /^[a-f0-9]{32}$/i.test(value)) return value;
          value = randomHex(32);
          localStorage.setItem(key, value);
          return value;
        } catch (e) {
          return randomHex(32);
        }
      }

      function vibixBuildVastUrl(info, podId, randValue, fpValue) {
        var url = String(info.requestUrl || '');
        if (!url) return '';

        url = url.replace('__VIBIX_RAND__', encodeURIComponent(String(randValue)));
        url += (url.indexOf('?') >= 0 ? '&' : '?') + 'fp=' + encodeURIComponent(fpValue || vibixGetFp());
        url += '&pod_id=' + encodeURIComponent(String(podId || 1));

        if (info.queryString) {
          var qs = String(info.queryString || '').replace(/^&+/, '').replace(/^\?+/, '');
          if (qs) url += '&' + qs;
        }

        return url;
      }

      function vibixNow() {
        return Date.now ? Date.now() : (new Date()).getTime();
      }

      function vibixLsGet(key) {
        try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
      }

      function vibixLsSet(key, value) {
        try { localStorage.setItem(key, String(value || '')); } catch (e) {}
      }

      function vibixLsDel(key) {
        try { localStorage.removeItem(key); } catch (e) {}
      }

      function vibixCooldownKey(kind) {
        if (kind == 'nofill') return 'vibix_vast_nofill_until';
        if (kind == 'bad') return 'vibix_vast_bad_until';
        return 'vibix_vast_blocked_until';
      }

      function vibixCooldownHours(ms) {
        return Math.max(1, Math.round((Number(ms) || 0) / 3600000));
      }

      function vibixGetActiveCooldown() {
        var now = vibixNow();
        var keys = [
          ['blocked', vibixCooldownKey('blocked')],
          ['bad', vibixCooldownKey('bad')],
          ['nofill', vibixCooldownKey('nofill')]
        ];
        for (var i = 0; i < keys.length; i++) {
          var until = Number(vibixLsGet(keys[i][1]) || 0);
          if (until && until > now) return { kind: keys[i][0], until: until, left: until - now };
        }
        return null;
      }

      function vibixSetCooldown(kind, ms, reason) {
        var until = vibixNow() + (Number(ms) || 0);
        vibixLsSet(vibixCooldownKey(kind), until);
        vibixLsSet('vibix_vast_last_fail', String(kind || '') + ';' + String(reason || '').slice(0, 180) + ';' + until);
        prepDebug('vibix_cooldown_set', 'kind=' + kind + ';h=' + vibixCooldownHours(ms) + ';reason=' + String(reason || '').slice(0, 120));
      }

      function vibixClearCooldowns() {
        vibixLsDel(vibixCooldownKey('blocked'));
        vibixLsDel(vibixCooldownKey('bad'));
        vibixLsDel(vibixCooldownKey('nofill'));
      }

      function vibixClassifyError(e) {
        var msg = shortErr(e);
        if (/timeout|timed\s*out|abort|network|failed|native\s+fail|status=|cors|blocked/i.test(msg)) return 'blocked';
        if (/bad\s+vibix|no\s+playable|bad\s+response/i.test(msg)) return 'bad';
        return 'blocked';
      }

      function vibixVastTimeout(info) {
        var v = Number(info && info.vastTimeoutMs);
        if (!isFinite(v) || v <= 0) v = 2500;
        return Math.max(1200, Math.min(5000, v));
      }

      function vibixMetaTimeout(info) {
        var v = Number(info && info.metaTimeoutMs);
        if (!isFinite(v) || v <= 0) v = 2500;
        return Math.max(1200, Math.min(5000, v));
      }

      function kodikHasAd(xml) {
        xml = String(xml || '');
        if (xml.indexOf('<VAST') < 0) return false;
        if (!/<Ad[\s>]/i.test(xml)) return false;
        if (/<VAST[^>]*>\s*<\/VAST>/i.test(xml)) return false;
        return true;
      }

      function kodikExtractPlayableMedia(xml) {
        xml = String(xml || '');
        if (!kodikHasAd(xml)) return '';
        if (!/<InLine\b/i.test(xml) || !/<MediaFile\b/i.test(xml)) return '';

        var firstVideo = '';
        var firstExt = '';
        var re = /<MediaFile\b([^>]*)>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/MediaFile>/ig;
        var m;

        while ((m = re.exec(xml))) {
          var attrs = String(m[1] || '');
          var media = String(m[2] || '').trim();
          var type = '';

          try {
            var tm = /type=["']([^"']+)/i.exec(attrs);
            type = tm ? String(tm[1] || '').toLowerCase() : '';
          } catch (ignoreType) {}

          if (!/^https?:\/\//i.test(media)) continue;
          if (/apiFramework=["']?VPAID/i.test(attrs)) continue;
          if (type.indexOf('javascript') >= 0 || type.indexOf('vpaid') >= 0) continue;

          if (!firstExt && /\.(mp4|m4v|mov)(\?|#|$)/i.test(media))
            firstExt = media;

          if (!firstVideo && type.indexOf('video/') == 0)
            firstVideo = media;
        }

        return firstExt || firstVideo || '';
      }

      function kodikHasPlayableVideoMedia(xml) {
        return !!kodikExtractPlayableMedia(xml);
      }

      function kodikRewritePlayableMediaToProbe(xml, info, adIndex) {
        if (!info || !info.mediaProbeBase) return String(xml || '');

        var media = kodikExtractPlayableMedia(xml);
        if (!media) return String(xml || '');

        var out = info.mediaProbeBase;
        out = appendParam(out, 'sid', (info.sid || '') + '_ad' + (adIndex || 1));
        out = appendParam(out, 'next', b64url(media));
        out = appendParam(out, '_v', Date.now());

        return String(xml || '').replace(/<MediaFiles\b[^>]*>[\s\S]*?<\/MediaFiles>/i, function() {
          return '<MediaFiles><MediaFile delivery="progressive" type="video/mp4" width="850" height="480" maintainAspectRatio="true" scalable="true"><![CDATA[' + out + ']]></MediaFile></MediaFiles>';
        });
      }

      function kodikRewritePodMediaToProbe(xml, info) {
        var count = 0;
        var changed = false;
        var out = String(xml || '').replace(/<Ad\b[\s\S]*?<\/Ad>/ig, function(ad) {
          count++;
          var rewritten = kodikRewritePlayableMediaToProbe(ad, info, count);
          if (rewritten != ad) changed = true;
          return rewritten;
        });

        if (!count)
          out = kodikRewritePlayableMediaToProbe(xml, info, 1);

        try {
          prepDebug('kodik_media_rewrite', changed || out != String(xml || '') ? 'yes' : 'no');
        } catch (ignoreMediaRewriteDbg) {}

        return out;
      }


      function kodikStatsStore() {
        try {
          window.__gmtlop_kodik_stats = window.__gmtlop_kodik_stats || {};
          return window.__gmtlop_kodik_stats;
        } catch (e) {}
        return {};
      }

      function kodikRegisterStatsProbe(info, adIndex, manifest) {
        try {
          if (!info || !info.sid || !info.statsUrl || !info.statsBase || !manifest) return;

          var sid = String(info.sid || '') + '_ad' + (adIndex || 1);
          var store = kodikStatsStore();

          store[sid] = {
            sid: sid,
            podSid: String(info.sid || ''),
            adIndex: Number(adIndex || 1),
            url: String(info.statsUrl || 'https://kodikplayer.com/stats'),
            base: String(info.statsBase || ''),
            manifest: String(manifest || ''),
            referer: String(info.link || ''),
            origin: String(info.statsOrigin || 'https://kodikplayer.com'),
            sent: {}
          };

          prepDebug('kodik_stats_registered', 'sid=' + sid + ';manifest=' + String(manifest || '').replace(/^https?:\/\//i, '').slice(0, 140));
        } catch (e) {
          try { prepDebug('kodik_stats_register_err', shortErr(e)); } catch (ignore) {}
        }
      }

      function kodikRegisterStatsPod(info, selectedCount) {
        try {
          if (!info || !info.sid) return;
          var store = kodikStatsStore();
          var selected = Math.max(0, Number(selectedCount || 0));
          var target = Number(info.targetAds || 2);
          if (!isFinite(target) || target <= 0) target = 2;
          target = Math.max(1, Math.min(2, target));
          if (selected > 0) target = Math.min(target, selected);

          store['__pod_' + String(info.sid || '')] = {
            sid: String(info.sid || ''),
            targetAds: target,
            selectedCount: selected,
            playSeq: 0,
            lastPlayTs: 0
          };
          try { window.__gmtlop_kodik_active_sid = String(info.sid || ''); } catch (ignoreActiveSid) {}
          prepDebug('kodik_stats_pod_registered', 'sid=' + String(info.sid || '') + ';selected=' + selectedCount + ';target=' + target);
        } catch (e) {
          try { prepDebug('kodik_stats_pod_register_err', shortErr(e)); } catch (ignore) {}
        }
      }

      function kodikStatsBody(item, eventName) {
        var base = String(item && item.base || '');
        if (!base) return '';

        // Match native Kodik order: type, site, event, manifest, then signed fields.
        var pos = base.indexOf('&d=');
        var head = pos >= 0 ? base.substring(0, pos) : base;
        var tail = pos >= 0 ? base.substring(pos) : '';

        return head +
          '&event=' + encodeURIComponent(eventName || '') +
          '&manifest=' + encodeURIComponent(String(item && item.manifest || '')) +
          tail;
      }

      function kodikSubmitStatsByForm(url, body, label) {
        try {
          var iframeName = 'gmtlop_kodik_stats_iframe';
          var iframe = document.getElementById(iframeName);
          if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.name = iframeName;
            iframe.id = iframeName;
            iframe.style.display = 'none';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.top = '-9999px';
            document.body.appendChild(iframe);
          }

          var form = document.createElement('form');
          form.method = 'POST';
          form.action = url;
          form.target = iframeName;
          form.enctype = 'application/x-www-form-urlencoded';
          form.acceptCharset = 'UTF-8';
          form.style.display = 'none';

          String(body || '').split('&').forEach(function(pair) {
            if (!pair) return;
            var eq = pair.indexOf('=');
            var k = eq >= 0 ? pair.substring(0, eq) : pair;
            var v = eq >= 0 ? pair.substring(eq + 1) : '';
            if (!k) return;

            var input = document.createElement('input');
            input.type = 'hidden';
            try { input.name = decodeURIComponent(k.replace(/\+/g, ' ')); } catch (ignoreK) { input.name = k; }
            try { input.value = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (ignoreV) { input.value = v; }
            form.appendChild(input);
          });

          document.body.appendChild(form);
          form.submit();
          setTimeout(function() {
            try { if (form && form.parentNode) form.parentNode.removeChild(form); } catch (ignoreRemove) {}
          }, 15000);

          prepDebug('kodik_stats_form', label || '');
          return true;
        } catch (e) {
          try { prepDebug('kodik_stats_form_err', shortErr(e)); } catch (ignore) {}
        }
        return false;
      }

      function kodikSendStatsEvent(item, eventName, reason, playSeq) {
        try {
          if (!item || !item.url || !eventName) return;
          item.sent = item.sent || {};
          var dedupeKey = String(eventName || '') + '#play=' + String(playSeq || 1);
          if (item.sent[dedupeKey]) return;
          item.sent[dedupeKey] = Date.now();

          var body = kodikStatsBody(item, eventName);
          if (!body) return;

          var label = 'sid=' + (item.sid || '') + ';ev=' + eventName + ';play=' + String(playSeq || 1) + ';reason=' + (reason || '');
          prepDebug('kodik_stats_send', label);

          // Kodik stats must leave from the client page; the response is not needed.
          var sent = false;

          try {
            if (window.fetch) {
              fetch(item.url, {
                method: 'POST',
                mode: 'no-cors',
                credentials: 'include',
                keepalive: true,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
              }).catch(function() {});
              prepDebug('kodik_stats_fetch', label);
              sent = true;
            }
          } catch (ignoreFetch) {
            try { prepDebug('kodik_stats_fetch_err', shortErr(ignoreFetch)); } catch (ignoreFetchDbg) {}
          }

          // WebView/Tizen fallback. This also creates a plain visible POST in HAR.
          // It is only used if fetch is missing/throws, so we do not intentionally duplicate.
          if (!sent)
            sent = kodikSubmitStatsByForm(item.url, body, label);

          if (!sent) {
            try {
              if (navigator && navigator.sendBeacon) {
                var blob = new Blob([body], { type: 'application/x-www-form-urlencoded' });
                sent = navigator.sendBeacon(item.url, blob);
                prepDebug('kodik_stats_beacon', label + ';sent=' + sent);
              }
            } catch (ignoreBeacon) {
              try { prepDebug('kodik_stats_beacon_err', shortErr(ignoreBeacon)); } catch (ignoreBeaconDbg) {}
            }
          }
        } catch (e) {
          try { prepDebug('kodik_stats_throw', shortErr(e)); } catch (ignore) {}
        }
      }

      function kodikSendStatsPlayBySid(podSid, reason) {
        try {
          podSid = String(podSid || '');
          if (!podSid) return false;

          var store = kodikStatsStore();
          var podKey = '__pod_' + podSid;
          var pod = store[podKey] || { sid: podSid, targetAds: 2, selectedCount: 0, playSeq: 0, lastPlayTs: 0 };
          var now = Date.now();

          // vast-stored and 21wiz start pixels can arrive for the same ad within milliseconds.
          // Count that as one real playback, but allow the next ad a few seconds later.
          if (pod.lastPlayTs && now - pod.lastPlayTs < 2500) {
            try { prepDebug('kodik_stats_play_debounce', 'sid=' + podSid + ';reason=' + (reason || '') + ';dt=' + (now - pod.lastPlayTs)); } catch (ignoreDebounceDbg) {}
            return false;
          }

          var selectedTarget = Math.max(0, Number(pod.selectedCount || 0));
          var target = selectedTarget > 0 ? selectedTarget : Number(pod.targetAds || 2);
          if (!isFinite(target) || target <= 0) target = 2;
          target = Math.max(1, Math.min(2, target));
          if (pod.playSeq >= target) {
            try { prepDebug('kodik_stats_play_limit', 'sid=' + podSid + ';seq=' + pod.playSeq + ';target=' + target); } catch (ignoreLimitDbg) {}
            return false;
          }

          var nextSeq = Number(pod.playSeq || 0) + 1;
          var item = store[podSid + '_ad' + nextSeq];
          if (!item && nextSeq == 1) item = store[podSid + '_ad1'];
          if (!item) {
            try { prepDebug('kodik_stats_play_no_item', 'sid=' + podSid + ';seq=' + nextSeq + ';reason=' + (reason || '')); } catch (ignoreNoItemDbg) {}
            return false;
          }

          pod.playSeq = nextSeq;
          pod.lastPlayTs = now;
          store[podKey] = pod;

          kodikSendStatsEvent(item, 'advert_started', reason || 'play', nextSeq);
          setTimeout(function() {
            kodikSendStatsEvent(item, 'impression', reason || 'play', nextSeq);
          }, 120);

          try { prepDebug('kodik_stats_play_send', 'sid=' + podSid + ';seq=' + nextSeq + ';item=' + (item.sid || '') + ';reason=' + (reason || '')); } catch (ignoreDbg) {}
          return true;
        } catch (e) {
          try { prepDebug('kodik_stats_play_err', shortErr(e)); } catch (ignore) {}
        }

        return false;
      }

      function kodikArmStatsFallback(info, reason) {
        try {
          if (!info || !info.sid) return;
          var podSid = String(info.sid || '');
          var store = kodikStatsStore();
          var podKey = '__pod_' + podSid;
          var pod = store[podKey] || { sid: podSid, targetAds: 2, playSeq: 0, lastPlayTs: 0 };

          // Some Lampa/native resource requests are invisible to PerformanceObserver.
          if (pod.fallbackTimersArmed) return;
          pod.fallbackTimersArmed = true;

          var selectedTarget = Math.max(0, Number(pod.selectedCount || 0));
          var target = selectedTarget > 0 ? selectedTarget : Number(pod.targetAds || (info && info.targetAds) || 2);
          if (!isFinite(target) || target <= 0) target = 2;
          target = Math.max(1, Math.min(2, target));

          var firstDelay = Number(info && info.statsFallbackFirstMs);
          if (!isFinite(firstDelay) || firstDelay < 1000) firstDelay = 4500;
          firstDelay = Math.max(1000, Math.min(9000, firstDelay));

          var gapDelay = Number(info && info.statsFallbackGapMs);
          if (!isFinite(gapDelay) || gapDelay < 5000) gapDelay = 14000;
          gapDelay = Math.max(5000, Math.min(25000, gapDelay));

          pod.fallbackTimers = pod.fallbackTimers || [];
          for (var slot = 1; slot <= target; slot++) {
            (function(playSlot) {
              var delay = firstDelay + (playSlot - 1) * gapDelay;
              var timer = setTimeout(function() {
                try {
                  var p = kodikStatsStore()[podKey] || {};
                  if (Number(p.playSeq || 0) >= playSlot) return;
                  kodikSendStatsPlayBySid(podSid, (reason || 'fallback') + '_slot' + playSlot);
                } catch (ignoreFallback) {}
              }, delay);
              pod.fallbackTimers.push(timer);
            })(slot);
          }

          store[podKey] = pod;
          prepDebug('kodik_stats_fallback_armed', 'sid=' + podSid + ';target=' + target + ';first=' + firstDelay + ';gap=' + gapDelay + ';reason=' + (reason || ''));
        } catch (e) {
          try { prepDebug('kodik_stats_fallback_err', shortErr(e)); } catch (ignore) {}
        }
      }

      function kodikMaybeSendStatsForProbe(url, source) {
        try {
          if (!/\/lite\/kodik\/media-probe/i.test(String(url || ''))) return false;

          var sid = getProbeSid(url || '');
          if (!sid) return false;

          var podSid = sid.replace(/_ad\d+$/i, '');
          return kodikSendStatsPlayBySid(podSid, source || 'probe');
        } catch (e) {
          try { prepDebug('kodik_stats_probe_err', shortErr(e)); } catch (ignore) {}
        }

        return false;
      }

      function kodikMaybeSendStatsForVastStored(url, source) {
        try {
          url = String(url || '');
          if (!/\/lite\/kodik\/vast-stored/i.test(url)) return false;
          var sid = getParam(url, 'sid') || '';
          if (!sid) { try { sid = window.__gmtlop_kodik_active_sid || ''; } catch (ignoreSid) {} }
          if (!sid) return false;
          return kodikSendStatsPlayBySid(String(sid || ''), source || 'vast_stored');
        } catch (e) {
          try { prepDebug('kodik_stats_stored_err', shortErr(e)); } catch (ignore) {}
        }
        return false;
      }

      function kodikMaybeSendStatsFor21wizStart(url, source) {
        try {
          url = String(url || '');
          if (!/logger\.21wiz\.com\/logger\.php/i.test(url)) return false;
          if (!/[?&]t=ad_impression[23](?:&|$)/i.test(url)) return false;
          var sid = '';
          try { sid = window.__gmtlop_kodik_active_sid || ''; } catch (ignoreSid) {}
          if (!sid) return false;
          return kodikSendStatsPlayBySid(String(sid || ''), source || '21wiz_start');
        } catch (e) {
          try { prepDebug('kodik_stats_21wiz_err', shortErr(e)); } catch (ignore) {}
        }
        return false;
      }

      function kodikStatsSeenResourceStore() {
        try {
          window.__gmtlop_kodik_stats_seen_resources = window.__gmtlop_kodik_stats_seen_resources || {};
          return window.__gmtlop_kodik_stats_seen_resources;
        } catch (e) {}
        return {};
      }

      function kodikStatsResourceKey(entryOrUrl) {
        try {
          if (entryOrUrl && typeof entryOrUrl == 'object') {
            return String(entryOrUrl.name || '') + '@' + String(Math.round(Number(entryOrUrl.startTime || 0) * 1000));
          }
        } catch (ignore) {}
        return String(entryOrUrl || '') + '@url';
      }

      function kodikMaybeSendStatsForResource(url, source) {
        try {
          url = String(url || '');
          if (!url) return false;
          if (kodikMaybeSendStatsForVastStored(url, source || 'resource')) return true;
          if (kodikMaybeSendStatsForProbe(url, source || 'resource')) return true;
          if (kodikMaybeSendStatsFor21wizStart(url, source || 'resource')) return true;
        } catch (e) {
          try { prepDebug('kodik_stats_resource_err', shortErr(e)); } catch (ignore) {}
        }
        return false;
      }

      function kodikMaybeSendStatsForResourceEntry(entry, source) {
        try {
          var url = entry && entry.name ? String(entry.name || '') : String(entry || '');
          if (!url) return false;
          if (!(/\/lite\/kodik\/(vast-stored|media-probe)/i.test(url) || /logger\.21wiz\.com\/logger\.php/i.test(url)))
            return false;

          var key = kodikStatsResourceKey(entry || url);
          var seen = kodikStatsSeenResourceStore();
          if (seen[key]) return false;
          seen[key] = Date.now();

          return kodikMaybeSendStatsForResource(url, source || 'resource_entry');
        } catch (e) {
          try { prepDebug('kodik_stats_resource_entry_err', shortErr(e)); } catch (ignore) {}
        }
        return false;
      }

      try { window.__gmtlop_kodik_maybe_send_stats_for_resource_entry = kodikMaybeSendStatsForResourceEntry; } catch (ignoreKodikStatsExpose) {}

      function kodikCheckMediaUrl(url, timeoutMs) {
        url = String(url || '');
        if (!/^https?:\/\//i.test(url)) return Promise.resolve(false);

        return new Promise(function(resolve) {
          var done = false;
          var video = null;
          var timer = null;

          function finish(ok) {
            if (done) return;
            done = true;
            try { clearTimeout(timer); } catch (ignoreTimer) {}
            try {
              if (video) {
                video.pause();
                video.removeAttribute('src');
                video.load();
                if (video.parentNode) video.parentNode.removeChild(video);
              }
            } catch (ignoreStop) {}
            resolve(!!ok);
          }

          try {
            video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;
            video.style.position = 'absolute';
            video.style.left = '-99999px';
            video.style.top = '-99999px';
            video.style.width = '1px';
            video.style.height = '1px';

            video.onloadedmetadata = function() { finish(true); };
            video.oncanplay = function() { finish(true); };
            video.onerror = function() { finish(false); };
            video.onstalled = function() {};
            video.onabort = function() { finish(false); };

            timer = setTimeout(function() { finish(false); }, Math.max(1200, Math.min(5000, Number(timeoutMs || 3500))));
            try { document.body.appendChild(video); } catch (ignoreAppend) {}
            video.src = url;
            try { video.load(); } catch (ignoreLoad) {}
          } catch (e) {
            finish(false);
          }
        });
      }

      function kodikEnsureMediaReachable(xml, info, idx) {
        var media = kodikExtractPlayableMedia(xml);
        if (!media) return Promise.resolve(false);

        var timeoutMs = Number(info && info.mediaCheckTimeoutMs);
        if (!isFinite(timeoutMs) || timeoutMs <= 0) timeoutMs = 3500;

        prepDebug('kodik_media_check_start', 'i=' + idx + ';media=' + media.replace(/^https?:\/\//i, '').slice(0, 140));

        return kodikCheckMediaUrl(media, timeoutMs).then(function(ok) {
          prepDebug(ok ? 'kodik_media_check_ok' : 'kodik_media_check_fail', 'i=' + idx + ';media=' + media.replace(/^https?:\/\//i, '').slice(0, 140));
          return ok;
        });
      }

      function kodikRandomUrl(url) {
        url = String(url || '');
        var rnd = String(Math.floor(Math.random() * 900000) + 100000);
        return url.replace(/\[random\]/ig, rnd).replace(/\[rnd\]/ig, rnd).replace(/\[timestamp\]/ig, Date.now());
      }

      function kodikNormalizeUrl(url) {
        url = kodikRandomUrl(url);
        if (!url) return '';
        if (url.indexOf('//') === 0) url = 'https:' + url;
        else if (url.charAt(0) == '/') url = 'https://kodikplayer.com' + url;
        return url;
      }

      function kodikExtractWrapperUrl(xml) {
        var u = extractNode(xml, 'VASTAdTagURI');
        if (!u) return '';
        u = u.replace(/&amp;/g, '&').trim();
        if (u.indexOf('//') === 0) u = 'https:' + u;
        return /^https?:\/\//i.test(u) ? u : '';
      }

      function kodikExtractAdParams(xml) {
        var raw = extractNode(xml, 'AdParameters') || '';
        if (!raw) return null;
        raw = raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
        try { return JSON.parse(raw); } catch (e) {}
        try { return (new Function('return (' + raw + ');'))(); } catch (e2) {}
        return null;
      }

      function kodikQueryParam(url, name) {
        try {
          var re = new RegExp('[?&]' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^&#]*)', 'i');
          var m = re.exec(String(url || ''));
          return m ? decodeURIComponent(String(m[1] || '').replace(/\+/g, ' ')) : '';
        } catch (e) {}
        return '';
      }

      function kodikReplaceVastTagPlaceholders(url, info) {
        var fp = '';
        try { fp = localStorage.getItem('kodik_device_fp') || ''; } catch (ignoreFp) {}
        if (!fp) {
          fp = randomHex(32);
          try { localStorage.setItem('kodik_device_fp', fp); } catch (ignoreSetFp) {}
        }

        // Important for 21wiz/Kodik: [session] is the VPAID/jmap session from
        // ovpaid AdParameters, not our local Lampac sid. If we replace it with
        // kodik_<guid>, media can play but logger.php impressions are not tied
        // to the ad request that produced the jmap/vast2 response.
        var trackSession = '';
        try { trackSession = (info && (info.vpaidSession || info.adSession || info.session || info.sid)) || ''; } catch (ignoreSession) {}
        if (!trackSession) trackSession = uuidLike();

        return String(url || '')
          .replace(/\[vt\]/ig, '100')
          .replace(/\[fp\]/ig, fp)
          .replace(/\[w\]/ig, '610')
          .replace(/\[h\]/ig, '370')
          .replace(/\[sw\]/ig, String((screen && screen.width) || 1920))
          .replace(/\[sh\]/ig, String((screen && screen.height) || 1080))
          .replace(/\[gguid\]/ig, uuidLike())
          .replace(/\[session\]/ig, encodeURIComponent(trackSession))
          .replace(/\[rnd\]/ig, String(Math.floor(Math.random() * 1000000)))
          .replace(/\[random\]/ig, String(Math.floor(Math.random() * 1000000)));
      }

      function kodikXmlCdata(value) {
        return String(value == null ? '' : value).replace(/\]\]>/g, ']]]]><![CDATA[>');
      }

      function kodikNormalizeTrackingUrl(url, info) {
        url = String(url || '').replace(/\\u0026/g, '&').replace(/&amp;/g, '&').trim();
        if (!url) return '';

        url = kodikReplaceVastTagPlaceholders(url, info);

        var pageUrl = '';
        var pageHost = '';
        try { pageUrl = encodeURIComponent(location.href || ''); } catch (ignorePageUrl) {}
        try { pageHost = encodeURIComponent((location && location.hostname) || ''); } catch (ignorePageHost) {}

        return String(url || '')
          .replace(/\[subs\]/ig, '')
          .replace(/\[rcnt\]/ig, '1')
          .replace(/\[tti\]/ig, '0')
          .replace(/\[sig\]/ig, '')
          .replace(/\[ls\]/ig, '1')
          .replace(/\[pr\]/ig, '1')
          .replace(/\[lh\]/ig, pageHost)
          .replace(/\[u\]/ig, pageUrl)
          .replace(/\[pos\]/ig, '0')
          .replace(/\[fpro\]/ig, '')
          .replace(/\[vid\]/ig, '')
          .replace(/\[[a-z0-9_]+\]/ig, '');
      }

      function kodikTrackingUrls(trackings, keys, info) {
        var out = [];
        var seen = {};
        keys = keys || [];
        trackings = trackings || {};

        for (var i = 0; i < keys.length; i++) {
          var v = trackings[keys[i]];
          if (!v) continue;
          if (!Array.isArray(v)) v = [v];

          for (var j = 0; j < v.length; j++) {
            var u = kodikNormalizeTrackingUrl(v[j], info);
            if (!u || !/^https?:\/\//i.test(u)) continue;
            if (seen[u]) continue;
            seen[u] = true;
            out.push(u);
          }
        }

        return out;
      }

      function kodikBuildImpressionNodes(urls) {
        var out = '';
        urls = urls || [];
        for (var i = 0; i < urls.length; i++)
          out += '\n              <Impression><![CDATA[' + kodikXmlCdata(urls[i]) + ']]></Impression>';
        return out;
      }

      function kodikBuildTrackingNodes(eventName, urls) {
        var out = '';
        urls = urls || [];
        for (var i = 0; i < urls.length; i++)
          out += '\n                              <Tracking event="' + eventName + '"><![CDATA[' + kodikXmlCdata(urls[i]) + ']]></Tracking>';
        return out;
      }

      function kodikBuildClickTrackingNodes(urls) {
        var out = '';
        urls = urls || [];
        for (var i = 0; i < urls.length; i++)
          out += '\n                              <ClickTracking><![CDATA[' + kodikXmlCdata(urls[i]) + ']]></ClickTracking>';
        return out;
      }

      function kodikInject21wizTrackings(vastXml, jmapItem, info) {
        vastXml = String(vastXml || '');
        var tr = jmapItem && jmapItem.trackings ? jmapItem.trackings : null;
        if (!tr || !vastXml) return vastXml;

        var impressions = kodikTrackingUrls(tr, ['i', 'tt'], info);
        var start = kodikTrackingUrls(tr, ['s', 'st'], info);
        var first = kodikTrackingUrls(tr, ['f'], info);
        var midpoint = kodikTrackingUrls(tr, ['m'], info);
        var third = kodikTrackingUrls(tr, ['t'], info);
        var complete = kodikTrackingUrls(tr, ['c'], info);
        var clicks = kodikTrackingUrls(tr, ['ck'], info);

        if (impressions.length) {
          var impXml = kodikBuildImpressionNodes(impressions);
          if (/<InLine\b[^>]*>/i.test(vastXml))
            vastXml = vastXml.replace(/(<InLine\b[^>]*>)/i, '$1' + impXml);
        }

        var teXml = '';
        teXml += kodikBuildTrackingNodes('start', start);
        teXml += kodikBuildTrackingNodes('firstQuartile', first);
        teXml += kodikBuildTrackingNodes('midpoint', midpoint);
        teXml += kodikBuildTrackingNodes('thirdQuartile', third);
        teXml += kodikBuildTrackingNodes('complete', complete);

        if (teXml) {
          if (/<TrackingEvents\b[^>]*>[\s\S]*?<\/TrackingEvents>/i.test(vastXml)) {
            vastXml = vastXml.replace(/<TrackingEvents\b([^>]*)>([\s\S]*?)<\/TrackingEvents>/i, function(all, attrs, inner) {
              return '<TrackingEvents' + (attrs || '') + '>' + (inner || '') + teXml + '\n                          </TrackingEvents>';
            });
          }
          else if (/<Linear\b[^>]*>/i.test(vastXml)) {
            vastXml = vastXml.replace(/(<Linear\b[^>]*>)/i, '$1\n                          <TrackingEvents>' + teXml + '\n                          </TrackingEvents>');
          }
        }

        if (clicks.length) {
          var ckXml = kodikBuildClickTrackingNodes(clicks);
          if (/<VideoClicks\b[^>]*>[\s\S]*?<\/VideoClicks>/i.test(vastXml)) {
            vastXml = vastXml.replace(/<\/VideoClicks>/i, ckXml + '\n                          </VideoClicks>');
          }
          else if (/<Linear\b[^>]*>[\s\S]*?<\/Linear>/i.test(vastXml)) {
            vastXml = vastXml.replace(/<\/Linear>/i, '\n                          <VideoClicks>' + ckXml + '\n                          </VideoClicks>\n                      </Linear>');
          }
        }

        try {
          prepDebug('kodik_vpaid_trackings', 'i=' + impressions.length + ';s=' + start.length + ';f=' + first.length + ';m=' + midpoint.length + ';t=' + third.length + ';c=' + complete.length + ';ck=' + clicks.length);
        } catch (ignoreDbg) {}

        return vastXml;
      }

      function kodikCandidateTimeoutMs(info, url) {
        var normal = Number(info && info.candidateTimeoutMs);
        if (!isFinite(normal) || normal <= 0) normal = 4500;

        var yandex = Number(info && info.yandexTimeoutMs);
        if (!isFinite(yandex) || yandex <= 0) yandex = 2000;

        url = String(url || '');
        if (/\/adfox\//i.test(url) || /(^|\/\/)yandex\./i.test(url) || /(^|\/\/)an\.yandex\./i.test(url))
          return Math.max(800, Math.min(2500, yandex));

        return normal;
      }

      function kodikResolve21wizVpaid(xml, sourceUrl, info, headers, idx) {
        // Kodik gives VPAID wrappers as normal VAST entries. Lampa cannot play that
        // JS creative directly, so reproduce the player-side jmap -> vast2 hop and
        // only keep the result when it contains a normal video MediaFile.
        var source = String(sourceUrl || '');
        if (!/\/ovpaid\.php/i.test(source) && !/\/mp_dist\/vpaid/i.test(String(xml || '')))
          return Promise.resolve('');

        var ap = kodikExtractAdParams(xml);
        if (!ap || !ap.key || !ap.session)
          return Promise.resolve('');

        var pageOrigin = (info && info.pageOrigin) || ap.ref || '';
        if (!pageOrigin && info && info.domain) pageOrigin = 'https://' + info.domain + '/';
        if (!pageOrigin) pageOrigin = 'https://onlymodels.icu/';
        // Native Kodik usually passes tanc/o without the trailing slash.
        // Keep it stable to avoid producing a different jmap/tracking context.
        try { pageOrigin = String(pageOrigin || '').replace(/\/+$/, ''); } catch (ignoreOriginNorm) {}

        var hostName = ap.jh || 'code.21wiz.com';
        var pos = kodikQueryParam(source, 'position') || 'pre';
        var cb = uuidLike();
        var ancs = encodeURIComponent(JSON.stringify(['https://kodikplayer.com', String(pageOrigin).replace(/\/$/, '')]));
        var cpRef = kodikQueryParam(source, 'cp.referer') || ap.ref || '';

        var jmap = 'https://' + hostName + '/go/jmap' +
          '?v=' + encodeURIComponent(ap.key || '') +
          '&sid=pre' +
          '&cp.referer=' + encodeURIComponent(cpRef || '') +
          '&it=' + encodeURIComponent(ap.it || 1) +
          '&tq=' + encodeURIComponent(ap.tq || 2) +
          '&cp.cb=' + encodeURIComponent(cb) +
          '&session=' + encodeURIComponent(ap.session || '') +
          '&position=' + encodeURIComponent(pos) +
          '&vt=100&ostream=false&isp=1&suri=' +
          '&rnd=' + Date.now();

        if (ap.maid) jmap += '&ma=' + encodeURIComponent(ap.maid);
        if (ap.aid) jmap += '&aid=' + encodeURIComponent(ap.aid);

        jmap += '&raw=yes' +
          '&tanc=' + encodeURIComponent(pageOrigin) +
          '&ancs=' + ancs;

        var jHeaders = {};
        try {
          for (var hk in (headers || {})) if (Object.prototype.hasOwnProperty.call(headers, hk)) jHeaders[hk] = headers[hk];
          jHeaders.accept = 'application/json';
        } catch (ignoreJHeaders) { jHeaders = headers || {}; }

        prepDebug('kodik_vpaid_jmap_start', 'i=' + idx + ';host=' + hostName + ';session=' + String(ap.session || '').slice(0, 80));

        var jmapItem = null;

        return nativeText(jmap, jHeaders, 'kodik_vpaid_jmap_' + idx, {
          timeout: 7000,
          dataType: 'text'
        }).then(function(text) {
          var arr = null;
          try { arr = JSON.parse(text || '[]'); } catch (e) { arr = null; }
          if (!arr || !arr.length || !arr[0] || !arr[0].tag) throw new Error('empty vpaid jmap');
          jmapItem = arr[0];

          var tag = kodikReplaceVastTagPlaceholders(String(arr[0].tag || '').replace(/\\u0026/g, '&'), info);
          if (!tag) throw new Error('empty vpaid tag');

          prepDebug('kodik_vpaid_tag', tag.replace(/^https?:\/\//i, '').slice(0, 140));

          return nativeText(tag, headers || {}, 'kodik_vpaid_vast_' + idx, {
            timeout: kodikCandidateTimeoutMs(info, tag),
            dataType: 'text'
          });
        }).then(function(vast2) {
          if (kodikHasPlayableVideoMedia(vast2)) {
            var trackInfo = {};
            try { for (var tk in (info || {})) if (Object.prototype.hasOwnProperty.call(info, tk)) trackInfo[tk] = info[tk]; } catch (ignoreTrackInfo) {}
            trackInfo.vpaidSession = ap.session || '';
            trackInfo.adSession = ap.session || '';
            trackInfo.vpaidKey = ap.key || '';
            trackInfo.vpaidHost = hostName || '';
            trackInfo.vpaidCb = cb || '';
            trackInfo.pageOrigin = pageOrigin || '';
            vast2 = kodikInject21wizTrackings(vast2, jmapItem, trackInfo);
            prepDebug('kodik_vpaid_playable', 'i=' + idx + ';session=' + String(ap.session || '').slice(0, 80) + ';len=' + String(vast2 || '').length);
            return vast2;
          }

          return '';
        }).catch(function(e) {
          prepDebug('kodik_vpaid_skip', 'i=' + idx + ';' + shortErr(e));
          return '';
        });
      }

      function kodikResolveWrapper(xml, info, headers, depth) {
        if (depth > 2) return Promise.resolve(xml);
        var wrap = kodikExtractWrapperUrl(xml);
        if (!wrap) return Promise.resolve(xml);

        prepDebug('kodik_wrapper', wrap.replace(/^https?:\/\//i, '').slice(0, 140));
        return nativeText(kodikNormalizeUrl(wrap), headers || {}, 'kodik_wrapper_' + depth, {
          timeout: kodikCandidateTimeoutMs(info, wrap),
          dataType: 'text'
        }).then(function(nextXml) {
          if (!nextXml || String(nextXml).indexOf('<VAST') < 0) return xml;
          if (kodikHasPlayableVideoMedia(nextXml)) return nextXml;
          return kodikResolveWrapper(nextXml, info, headers, depth + 1);
        }).catch(function() {
          return xml;
        });
      }

      if (clientVastProvider == 'kodik') {
        nativeText(element.vast_url, {}, 'kodik_meta', {
          timeout: 10000,
          dataType: 'text'
        })
          .then(function(text) {
            try { return typeof text == 'string' ? JSON.parse(text || '{}') : text; } catch (e) { throw new Error('bad kodik meta json'); }
          })
          .then(function(info) {
            if (!info || info.disabled) throw new Error(info && info.reason ? info.reason : 'kodik disabled');
            var urls = [];
            try { urls = info.urls || []; } catch (ignoreUrls) {}
            if (!urls.length) throw new Error('no kodik urls');

            element.__veoveo_client_debug_base = info.clientDebugBase || '';
            element.__veoveo_client_sid = info.sid || '';
            element.__veoveo_req_headers = info.headers || {};

            var targetAds = Number(info.targetAds || 2);
            if (!isFinite(targetAds) || targetAds <= 0) targetAds = 2;
            targetAds = Math.min(2, targetAds);

            var headers = info.headers || {};
            var selected = [];
            var chain = Promise.resolve();

            // Kodik's reserve_vast list can be 25-40 entries long. The real player
            // also treats most of them as no-fill. Do not block playback by scanning
            // the whole waterfall; keep a small bounded pass and only store playable
            // video ads.
            var maxAttempts = Number(info.maxAttempts || 10);
            if (!isFinite(maxAttempts) || maxAttempts <= 0) maxAttempts = 10;
            maxAttempts = Math.max(4, Math.min(12, maxAttempts));
            var scanLimit = Math.min(urls.length, maxAttempts);

            prepDebug('kodik_meta_ok', 'sid=' + (info.sid || '') + ';urls=' + urls.length + ';target=' + targetAds + ';scan=' + scanLimit);
            kodikLoadingStart();

            function loadKodikCandidate(url, idx) {
              url = kodikNormalizeUrl(url);
              if (!url) return Promise.resolve({ ok: false, err: 'empty url' });

              var manifestUrl = url;
              prepDebug('kodik_vast_start', 'i=' + idx + ';url=' + url.replace(/^https?:\/\//i, '').slice(0, 140));

              return nativeText(url, headers, 'kodik_vast_' + idx, {
                timeout: kodikCandidateTimeoutMs(info, url),
                dataType: 'text'
              }).then(function(xml) {
                if (!xml || String(xml).indexOf('<VAST') < 0) throw new Error('bad vast response');

                return kodikResolve21wizVpaid(xml, url, info, headers, idx).then(function(vast2) {
                  if (vast2) return vast2;
                  return kodikResolveWrapper(xml, info, headers, 0);
                });
              }).then(function(xml) {
                if (kodikHasPlayableVideoMedia(xml)) {
                  return kodikEnsureMediaReachable(xml, info, idx).then(function(mediaOk) {
                    if (mediaOk) {
                      prepDebug('kodik_vast_playable', 'i=' + idx + ';len=' + String(xml || '').length);
                      return { ok: true, xml: xml, manifest: manifestUrl };
                    }

                    prepDebug('kodik_vast_media_unplayable', 'i=' + idx + ';len=' + String(xml || '').length);
                    return { ok: false, xml: '', err: 'media-unplayable' };
                  });
                }

                if (kodikHasAd(xml)) {
                  prepDebug('kodik_vast_nonplayable', 'i=' + idx + ';len=' + String(xml || '').length);
                  return { ok: false, xml: '', err: 'non-playable' };
                }

                return { ok: false, xml: '', err: 'no-ad' };
              }).catch(function(e) {
                prepDebug('kodik_vast_err', 'i=' + idx + ';' + shortErr(e));
                return { ok: false, xml: '', err: shortErr(e) };
              });
            }

            for (var ki = 0; ki < scanLimit; ki++) {
              (function(url, idx) {
                chain = chain.then(function() {
                  if (selected.length >= targetAds) return null;

                  return loadKodikCandidate(url, idx).then(function(res) {
                    if (res && res.ok && res.xml) selected.push({ xml: res.xml, manifest: res.manifest || url });

                    if (selected.length >= targetAds) return null;

                    return new Promise(function(resolve) { setTimeout(resolve, 60); });
                  });
                });
              })(urls[ki], ki);
            }

            return chain.then(function() {
              if (!selected.length)
                throw new Error('kodik no playable vast');

              prepDebug('kodik_selected', 'count=' + selected.length + ';scan=' + scanLimit);
              return mergeVastPod(selected.map(function(item) { return item && item.xml ? item.xml : ''; }), 'kodik');
            }).then(function(vastXml) {
              if (!kodikHasAd(vastXml)) throw new Error('bad kodik pod');

              try {
                for (var ksi = 0; ksi < selected.length; ksi++)
                  kodikRegisterStatsProbe(info, ksi + 1, selected[ksi] && selected[ksi].manifest);
                kodikRegisterStatsPod(info, selected.length);
              } catch (ignoreKodikStatsRegister) {}

              vastXml = kodikRewritePodMediaToProbe(vastXml, info);

              var probeInfo = {};
              for (var pk in (info || {})) probeInfo[pk] = info[pk];
              probeInfo.probeAsMediaFile = false;
              vastXml = addDirtyProbeToPod(vastXml, probeInfo);
              prepDebug('kodik_probe_built', (element.__veoveo_probe_urls && element.__veoveo_probe_urls.length) ? ('count=' + element.__veoveo_probe_urls.length) : 'no');

              if (info.vastStoreUrl && info.vastStoredUrl) {
                var storeUrl = appendParam(appendParam(info.vastStoreUrl, 'sid', info.sid || ''), '_v', Date.now());
                prepDebug('kodik_store_start', 'len=' + vastXml.length);
                return nativeText(storeUrl, { 'Content-Type': 'application/xml;charset=utf-8' }, 'kodik_store', {
                  method: 'POST',
                  body: vastXml,
                  timeout: 8000,
                  dataType: 'text'
                }).then(function() {
                  element.vast_url = appendParam(appendParam(info.vastStoredUrl, 'sid', info.sid || ''), '_v', Date.now());
                  element.__veoveo_client_vast = true;
                  element.__kodik_client_vast = true;
                  prepDebug('kodik_stored_ready', element.vast_url);
                  kodikArmStatsFallback(info, 'stored_ready_fallback');
                  finish();
                });
              }

              if (!setVastBlob(vastXml)) throw new Error('kodik blob failed');
              element.__kodik_client_vast = true;
              prepDebug('kodik_blob_ready', '');
              kodikArmStatsFallback(info, 'blob_ready_fallback');
              finish();
            });
          })
          .catch(function(e) {
            try { prepDebug('kodik_fail', e && e.message ? e.message : e); } catch (ignore) {}
            fallback(null, e && e.message ? e.message : e);
          });

        return;
      }


      if (clientVastProvider == 'vibix') {

        // Client-side cooldown is intentional for Vibix. On some providers/VPNs
        // the external Vibix VAST request stalls; during the cooldown window we
        // skip the client VAST path immediately instead of freezing the UI.
        var activeCooldown = vibixGetActiveCooldown();
        if (activeCooldown) {
          prepDebug('vibix_cooldown_skip', 'kind=' + activeCooldown.kind + ';left_ms=' + activeCooldown.left);
          fallback(null, 'vibix cooldown ' + activeCooldown.kind);
          return;
        }

        nativeText(appendParam(appendParam(element.vast_url, '_v', Date.now()), '_r', Math.random()), {}, 'vibix_meta', {
          timeout: 2500,
          dataType: 'text'
        })
          .then(function(text) {
            try { return typeof text == 'string' ? JSON.parse(text || '{}') : text; } catch (e) { throw new Error('bad vibix meta json'); }
          })
          .then(function(info) {
            if (!info || !info.requestUrl) throw new Error('no vibix requestUrl');

            element.__veoveo_client_debug_base = info.clientDebugBase || '';
            element.__veoveo_client_sid = info.sid || '';
            element.__veoveo_req_headers = info.headers || {};

            var fp = vibixGetFp();
            var pods = [];
            try {
              if (info.pods && info.pods.length) pods = info.pods;
            } catch (ignorePods) {}
            if (!pods.length) pods = [1];

            prepDebug('vibix_meta_ok', 'sid=' + (info.sid || '') + ';pods=' + pods.join(','));

            function loadVibixPod(podId, idx) {
              // Each Vibix pod must be an independent ad request. Reusing one
              // __VIBIX_RAND__ value for pod1+pod2 can make the last requested
              // pod win the ad-session on Android/WebView: pod1 media is then
              // skipped and only pod2 plays. Keep the device fp stable, but make
              // the auction/cache-buster random value unique per pod.
              var podRand = Math.random();
              var url = vibixBuildVastUrl(info, podId, podRand, fp);
              if (!url) return Promise.resolve('');

              prepDebug('vibix_vast_start', 'pod=' + podId + ';idx=' + idx + ';rand=' + String(podRand).slice(2, 10) + ';timeout=' + vibixVastTimeout(info) + ';url=' + url.replace(/^https?:\/\//i, '').slice(0, 120));
              return nativeText(url, info.headers || {}, 'vibix_vast_pod_' + podId, {
                timeout: vibixVastTimeout(info),
                dataType: 'text'
              }).then(function(xml) {
                if (!xml || String(xml).indexOf('<VAST') < 0) {
                  throw new Error('bad vibix vast response');
                }

                if (!vibixHasAd(xml)) {
                  prepDebug('vibix_vast_nofill', 'pod=' + podId + ';len=' + ((xml || '').length));
                  return { ok: false, kind: 'nofill', xml: '', err: 'no-fill' };
                }

                prepDebug('vibix_vast_ok', 'pod=' + podId + ';len=' + ((xml || '').length));
                return { ok: true, kind: '', xml: xml, err: '' };
              }).catch(function(e) {
                var kind = vibixClassifyError(e);
                prepDebug('vibix_vast_err', 'pod=' + podId + ';kind=' + kind + ';' + (e && e.message ? e.message : e));
                return { ok: false, kind: kind, xml: '', err: e && e.message ? e.message : e };
              });
            }

            function loadVibixPodsSequentially(podIds) {
              podIds = podIds || [];
              var results = [];
              var chain = Promise.resolve();
              for (var si = 0; si < podIds.length; si++) {
                (function(podId, idx) {
                  chain = chain.then(function() {
                    return loadVibixPod(podId, idx).then(function(res) {
                      results.push(res);
                      return new Promise(function(resolve) {
                        setTimeout(resolve, 120);
                      });
                    });
                  });
                })(podIds[si], si);
              }
              return chain.then(function() { return results; });
            }

            // Do not request all Vibix pods in parallel. Some Android/WebView setups
            // skip the first media when both VAST pods are fetched at the same time.
            // Keep both ads, but load pod XMLs in order with a tiny gap, then merge.
            return loadVibixPodsSequentially(pods).then(function(results) {
              results = results || [];
              var list = [];
              var failKind = '';
              var failReason = '';
              for (var ri = 0; ri < results.length; ri++) {
                if (results[ri] && results[ri].ok && vibixHasAd(results[ri].xml)) {
                  list.push(results[ri].xml);
                } else if (results[ri] && !failKind) {
                  failKind = results[ri].kind || 'blocked';
                  failReason = results[ri].err || failKind;
                }
              }

              if (!list.length) {
                if (failKind == 'nofill') vibixSetCooldown('nofill', 20 * 60 * 1000, failReason || 'no-fill');
                else if (failKind == 'bad') vibixSetCooldown('bad', 60 * 60 * 1000, failReason || 'bad-vast');
                else vibixSetCooldown('blocked', 6 * 60 * 60 * 1000, failReason || 'network-timeout');
                throw new Error('vibix no playable vast; kind=' + (failKind || 'blocked'));
              }

              vibixClearCooldowns();
              prepDebug('vibix_pod_loaded', 'count=' + list.length);
              return buildVibixVastPod(list, info, { onePerXml: true, label: 'pods' });
            }).then(function(vastXml) {
              // Vibix XML is already normalized by buildVibixVastPod(). Do not run a
              // second merge/sanitize pass because Android/Lampa is sensitive to
              // the exact ad order in the final pod.
              if (!vibixHasAd(vastXml)) throw new Error('bad vibix vast xml');

              // Vibix VAST already contains native impression/quartile/complete tracking.
              // We do not inject dirty media-probe. For clicks only, store ClickThrough/ClickTracking
              // and start a short overlay when the real ad media/start pixel is observed.
              try { element.__veoveo_probe_urls = []; element.__veoveo_probe_url = ''; } catch(ignoreProbeClear) {}
              var vibixClicks = extractVibixClickInfos(vastXml);
              var vibixClick = vibixClicks[0] || { ct: '', ck: '', dur: 12, media: '' };
              element.__vibix_client_vast = true;
              element.__vibix_click_ads = vibixClicks;
              element.__vibix_click_through = vibixClick.ct || '';
              element.__vibix_click_tracking = vibixClick.ck || '';
              element.__vibix_ad_duration = vibixClick.dur || 12;
              element.__vibix_ad_media = vibixClick.media || '';
              prepDebug('vibix_click_meta', 'count=' + vibixClicks.length + ';ct=' + (!!vibixClick.ct) + ';ck=' + (!!vibixClick.ck) + ';dur=' + (vibixClick.dur || 0));

              if (info.vastStoreUrl && info.vastStoredUrl) {
                var storeUrl = appendParam(appendParam(info.vastStoreUrl, 'sid', info.sid || ''), '_v', Date.now());
                prepDebug('vibix_store_start', 'len=' + vastXml.length);
                return nativeText(storeUrl, { 'Content-Type': 'application/xml;charset=utf-8' }, 'vibix_store', {
                  method: 'POST',
                  body: vastXml,
                  timeout: 5000,
                  dataType: 'text'
                }).then(function() {
                  element.vast_url = appendParam(appendParam(info.vastStoredUrl, 'sid', info.sid || ''), '_v', Date.now());
                  element.__veoveo_client_vast = true;
                  element.__vibix_client_vast = true;
                  prepDebug('vibix_stored_ready', element.vast_url);
                  finish();
                });
              }

              if (!setVastBlob(vastXml)) throw new Error('vibix blob failed');
              prepDebug('vibix_blob_ready', '');
              finish();
            });
          })
          .catch(function(e) {
            try { prepDebug('vibix_fail', e && e.message ? e.message : e); } catch (ignore) {}
            fallback(null, e && e.message ? e.message : e);
          });

        return;
      }

      nativeText(element.vast_url, {}, 'meta', {
        timeout: 15000,
        dataType: 'text'
      })
        .then(function(text) {
          try { return typeof text == 'string' ? JSON.parse(text || '{}') : text; } catch (e) { throw new Error('bad meta json'); }
        })
        .then(function(info) {
          if (!info || !info.iframeUrl) throw new Error('no iframeUrl');
          element.__veoveo_client_debug_base = info.clientDebugBase || '';
          element.__veoveo_client_sid = info.sid || '';
          prepDebug('meta_ok', 'sid=' + (info.sid || '') + ';store=' + (!!info.vastStoreUrl));
          prepDebug('iframe_start', '');

          nativeText(info.iframeUrl, {}, 'iframe', {
            timeout: 15000,
            dataType: 'text'
          }).then(function(html) {
            prepDebug('iframe_ok', 'len=' + ((html || '').length));
            var reqHeaders = parseRequestHeaders(html);
            var adJson = parseAdJson(html);
            var vastUrls = [];
            try {
              var pr = adJson && adJson.prerollList ? adJson.prerollList : [];
              for (var ai = 0; ai < pr.length && ai < 2; ai++) {
                if (pr[ai] && pr[ai].vastUrl) vastUrls.push(pr[ai].vastUrl);
              }
            } catch (ignore) {}
            var vastUrl = vastUrls[0];
            if (!vastUrl) throw new Error('no client vastUrl');
            prepDebug('vast_urls', 'count=' + vastUrls.length + ';first=' + vastUrl.replace(/^https?:\/\//i, '').slice(0, 100));

            reqHeaders = ensureIframeLikeContextHeaders(reqHeaders || {});

            element.__veoveo_req_headers = reqHeaders;
            element.__veoveo_client_debug_base = info.clientDebugBase || '';
            element.__veoveo_client_sid = info.sid || '';

            prepDebug('client_vast_headers', 'dle=' + (!!reqHeaders['DLE-API-TOKEN']) + ';ifr=' + (!!reqHeaders['Iframe-Request-Id']));

            return Promise.resolve(true).then(function() {
              prepDebug('ctx_skip', 'native_pod_test');
              prepDebug('vast_start', 'native_pod_count=' + vastUrls.length);

              function loadOneVast(url, idx) {
                prepDebug('vast_item_start', 'i=' + idx + ';url=' + String(url || '').replace(/^https?:\/\//i, '').slice(0, 90));
                return lampaReguestText(url, reqHeaders).then(function(x) {
                  prepDebug('vast_item_ok', 'i=' + idx + ';len=' + ((x || '').length));
                  return x;
                });
              }

              return Promise.all(vastUrls.map(function(u, idx) { return loadOneVast(u, idx); })).then(function(list) {
                prepDebug('pod_loaded', 'count=' + list.length);
                return mergeVastPod(list);
              });
            }).then(function(vastXml) {
              prepDebug('vast_ok', 'len=' + ((vastXml || '').length));
              if (!vastXml || vastXml.indexOf('<VAST') == -1) throw new Error('bad vast xml');
              vastXml = addDirtyProbeToPod(vastXml, info);
              prepDebug('probe_built', (element.__veoveo_probe_urls && element.__veoveo_probe_urls.length) ? ('count=' + element.__veoveo_probe_urls.length) : (element.__veoveo_probe_url ? 'yes' : 'no'));

              // Android may fail to pass blob:/data: VAST URLs to the internal player.
              // Keep the ad decision client-side, but store the already loaded XML on Lampac
              // and give the player a normal HTTP URL.
              if (info.vastStoreUrl && info.vastStoredUrl) {
                var storeUrl = appendParam(appendParam(info.vastStoreUrl, 'sid', info.sid || ''), '_v', Date.now());
                prepDebug('store_start', 'len=' + vastXml.length);
                return nativeText(storeUrl, { 'Content-Type': 'application/xml;charset=utf-8' }, 'store', {
                  method: 'POST',
                  body: vastXml,
                  timeout: 15000,
                  dataType: 'text'
                }).then(function() {
                  prepDebug('store_status', 'native_ok');
                  element.vast_url = appendParam(appendParam(info.vastStoredUrl, 'sid', info.sid || ''), '_v', Date.now());
                  element.__veoveo_client_vast = true;
                  prepDebug('stored_ready', element.vast_url);
                  finish();
                });
              }

              if (!setVastBlob(vastXml)) throw new Error('blob failed');
              prepDebug('blob_ready', '');
              finish();
            });
          }).catch(function(e) {
            prepDebug('client_fail', e && e.message ? e.message : e);
            fallback(info, e && e.message ? e.message : e);
          });
        })
        .catch(function(e) {
          try { element.__veoveo_client_debug_base = element.__veoveo_client_debug_base || ''; prepDebug('meta_fail', e && e.message ? e.message : e); } catch (ignore) {}
          fallback(null, e && e.message ? e.message : e);
        });
    };

    this.display = function(videos) {
      var _this5 = this;
      this.draw(videos, {
        onEnter: function onEnter(item, html) {
          _this5.getFileUrl(item, function(json, json_call) {
            if (json && json.url) {
              var playlist = [];
              var first = _this5.toPlayElement(item);
              first.url = json.url;
              first.headers = json_call.headers || json.headers;
              first.quality = json_call.quality || item.qualitys;
			  first.segments = json_call.segments || item.segments;
              first.hls_manifest_timeout = json_call.hls_manifest_timeout || json.hls_manifest_timeout;
              first.subtitles = json.subtitles;
			  first.subtitles_call = json_call.subtitles_call || json.subtitles_call;
			  if (json.vast && json.vast.url) {
                first.vast_url = json.vast.url;
                first.vast_msg = json.vast.msg;
                first.vast_region = json.vast.region;
                first.vast_platform = json.vast.platform;
                first.vast_screen = json.vast.screen;
			  }
              _this5.orUrlReserve(first);
              _this5.setDefaultQuality(first);
              if (item.season) {
                videos.forEach(function(elem) {
                  var cell = _this5.toPlayElement(elem);
                  if (elem == item) cell.url = json.url;
                  else {
                    if (elem.method == 'call') {
                      if (Lampa.Storage.field('player') !== 'inner') {
                        cell.url = elem.stream;
						delete cell.quality;
                      } else {
                        cell.url = function(call) {
                          _this5.getFileUrl(elem, function(stream, stream_json) {
                            if (stream.url) {
                              cell.url = stream.url;
                              cell.quality = stream_json.quality || elem.qualitys;
							  cell.segments = stream_json.segments || elem.segments;
                              cell.subtitles = stream.subtitles;
                              _this5.orUrlReserve(cell);
                              _this5.setDefaultQuality(cell);
                              elem.mark();
                            } else {
                              cell.url = '';
                              Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
                            }
                            call();
                          }, function() {
                            cell.url = '';
                            call();
                          });
                        };
                      }
                    } else {
                      cell.url = elem.url;
                    }
                  }
                  _this5.orUrlReserve(cell);
                  _this5.setDefaultQuality(cell);
                  playlist.push(cell);
                }); //Lampa.Player.playlist(playlist) 
              } else {
                playlist.push(first);
              }
              if (playlist.length > 1) first.playlist = playlist;
              if (first.url) {
                var element = first;
				element.isonline = true;

                var gaParams = lampacGaMovieParams(object.movie);
                gaParams.balancer = balanser || '';
                gaParams.quality = first.quality || item.qualitys || '';
                gaParams.season = item.season || '';
                gaParams.episode = item.episode || '';
                gaParams.has_vast = first.vast_url ? '1' : '0';
                lampacGaEvent('lampac_stream_open', gaParams);

                var playNow = function() {
                  _this5.startClientVastClick(element);
                  
                  Lampa.Player.play(element);
                  Lampa.Player.playlist(playlist);
				  if(element.subtitles_call) _this5.loadSubtitles(element.subtitles_call)
                  item.mark();
                  _this5.updateBalanser(balanser);
                };
                _this5.prepareClientVast(element, playNow);
              } else {
                Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
              }
            } else Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
          }, true);
        },
        onContextMenu: function onContextMenu(item, html, data, call) {
          _this5.getFileUrl(item, function(stream) {
            call({
              file: stream.url,
              quality: item.qualitys
            });
          }, true);
        }
      });
      this.filter({
        season: filter_find.season.map(function(s) {
          return s.title;
        }),
        voice: filter_find.voice.map(function(b) {
          return b.title;
        })
      }, this.getChoice());
    };
	this.loadSubtitles = function(link){
		network.silent(account(link), function(subs){
			Lampa.Player.subtitles(subs)
		}, function() {},false, {
            headers: addHeaders()
		  })
	}
    this.parse = function(str) {
      var json = Lampa.Arrays.decodeJson(str, {});
      if (Lampa.Arrays.isObject(str) && str.rch) json = str;
      if (json.rch) return this.rch(json);
      try {
        var items = this.parseJsonDate(str, '.videos__item');
        var buttons = this.parseJsonDate(str, '.videos__button');
        if (items.length == 1 && items[0].method == 'link' && !items[0].similar) {
          filter_find.season = items.map(function(s) {
            return {
              title: s.text,
              url: s.url
            };
          });
          this.replaceChoice({
            season: 0
          });
          this.request(items[0].url);
        } else {
          this.activity.loader(false);
          var videos = items.filter(function(v) {
            return v.method == 'play' || v.method == 'call';
          });
          var similar = items.filter(function(v) {
            return v.similar;
          });
          if (videos.length) {
            if (buttons.length) {
              filter_find.voice = buttons.map(function(b) {
                return {
                  title: b.text,
                  url: b.url
                };
              });
              var select_voice_url = this.getChoice(balanser).voice_url;
              var select_voice_name = this.getChoice(balanser).voice_name;
              var find_voice_url = buttons.find(function(v) {
                return v.url == select_voice_url;
              });
              var find_voice_name = buttons.find(function(v) {
                return v.text == select_voice_name;
              });
              var find_voice_active = buttons.find(function(v) {
                return v.active;
              }); ////console.log('b',buttons)
              ////console.log('u',find_voice_url)
              ////console.log('n',find_voice_name)
              ////console.log('a',find_voice_active)
              if (find_voice_url && !find_voice_url.active) {
                //console.log('Lampac', 'go to voice', find_voice_url);
                this.replaceChoice({
                  voice: buttons.indexOf(find_voice_url),
                  voice_name: find_voice_url.text
                });
                this.request(find_voice_url.url);
              } else if (find_voice_name && !find_voice_name.active) {
                //console.log('Lampac', 'go to voice', find_voice_name);
                this.replaceChoice({
                  voice: buttons.indexOf(find_voice_name),
                  voice_name: find_voice_name.text
                });
                this.request(find_voice_name.url);
              } else {
                if (find_voice_active) {
                  this.replaceChoice({
                    voice: buttons.indexOf(find_voice_active),
                    voice_name: find_voice_active.text
                  });
                }
                this.display(videos);
              }
            } else {
              this.replaceChoice({
                voice: 0,
                voice_url: '',
                voice_name: ''
              });
              this.display(videos);
            }
          } else if (items.length) {
            if (similar.length) {
              this.similars(similar);
              this.activity.loader(false);
            } else { //this.activity.loader(true)
              filter_find.season = items.map(function(s) {
                return {
                  title: s.text,
                  url: s.url
                };
              });
              var select_season = this.getChoice(balanser).season;
              var season = filter_find.season[select_season];
              if (!season) season = filter_find.season[0];
              //console.log('Lampac', 'go to season', season);
              this.request(season.url);
            }
          } else {
            this.doesNotAnswer(json);
          }
        }
      } catch (e) {
        //console.log('Lampac', 'error', e.stack);
        this.doesNotAnswer(e);
      }
    };
    this.similars = function(json) {
      var _this6 = this;
      scroll.clear();
      json.forEach(function(elem) {
        elem.title = elem.text;
        elem.info = '';
        var info = [];
        var year = ((elem.start_date || elem.year || object.movie.release_date || object.movie.first_air_date || '') + '').slice(0, 4);
        if (year) info.push(year);
        if (elem.details) info.push(elem.details);
        var name = elem.title || elem.text;
        elem.title = name;
        elem.time = elem.time || '';
        elem.info = info.join('<span class="online-prestige-split">●</span>');
        var item = Lampa.Template.get('lampac_prestige_folder', elem);
		if (elem.img) {
		  var image = $('<img style="height: 7em; width: 7em; border-radius: 0.3em;"/>');
		  item.find('.online-prestige__folder').empty().append(image);

		  if (elem.img !== undefined) {
		    if (elem.img.charAt(0) === '/')
		      elem.img = Defined.localhost + elem.img.substring(1);
		    if (elem.img.indexOf('/proxyimg') !== -1)
		      elem.img = account(elem.img);
		  }

		  Lampa.Utils.imgLoad(image, elem.img);
		}
        item.on('hover:enter', function() {
          _this6.reset();
          _this6.request(elem.url);
        }).on('hover:focus', function(e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        scroll.append(item);
      });
	  this.filter({
        season: filter_find.season.map(function(s) {
          return s.title;
        }),
        voice: filter_find.voice.map(function(b) {
          return b.title;
        })
      }, this.getChoice());
      Lampa.Controller.enable('content');
    };
    this.getChoice = function(for_balanser) {
      var data = Lampa.Storage.cache('online_choice_' + (for_balanser || balanser), 3000, {});
      var save = data[object.movie.id] || {};
      Lampa.Arrays.extend(save, {
        season: 0,
        voice: 0,
        voice_name: '',
        voice_id: 0,
        episodes_view: {},
        movie_view: ''
      });
      return save;
    };
    this.saveChoice = function(choice, for_balanser) {
      var data = Lampa.Storage.cache('online_choice_' + (for_balanser || balanser), 3000, {});
      data[object.movie.id] = choice;
      Lampa.Storage.set('online_choice_' + (for_balanser || balanser), data);
      this.updateBalanser(for_balanser || balanser);
    };
    this.replaceChoice = function(choice, for_balanser) {
      var to = this.getChoice(for_balanser);
      Lampa.Arrays.extend(to, choice, true);
      this.saveChoice(to, for_balanser);
    };
    this.clearImages = function() {
      images.forEach(function(img) {
        img.onerror = function() {};
        img.onload = function() {};
        img.src = '';
      });
      images = [];
    };
    /**
     * Очистить список файлов
     */
    this.reset = function() {
      last = false;
      clearInterval(balanser_timer);
      network.clear();
      this.clearImages();
      scroll.render().find('.empty').remove();
      scroll.clear();
      scroll.reset();
      scroll.body().append(Lampa.Template.get('lampac_content_loading'));
    };
    /**
     * Загрузка
     */
    this.loading = function(status) {
      if (status) this.activity.loader(true);
      else {
        this.activity.loader(false);
        this.activity.toggle();
      }
    };
    /**
     * Построить фильтр
     */
    this.filter = function(filter_items, choice) {
      var _this7 = this;
      var select = [];
      var add = function add(type, title) {
        var need = _this7.getChoice();
        var items = filter_items[type];
        var subitems = [];
        var value = need[type];
        items.forEach(function(name, i) {
          subitems.push({
            title: name,
            selected: value == i,
            index: i
          });
        });
        select.push({
          title: title,
          subtitle: items[value],
          items: subitems,
          stype: type
        });
      };
      filter_items.source = filter_sources;
      select.push({
        title: Lampa.Lang.translate('torrent_parser_reset'),
        reset: true
      });
      this.saveChoice(choice);
      if (filter_items.voice && filter_items.voice.length) add('voice', Lampa.Lang.translate('torrent_parser_voice'));
      if (filter_items.season && filter_items.season.length) add('season', Lampa.Lang.translate('torrent_serial_season'));
      filter.set('filter', select);
      filter.set('sort', filter_sources.map(function(e) {
        return {
          title: sources[e].name,
          source: e,
          selected: e == balanser,
          ghost: !sources[e].show
        };
      }));
      this.selected(filter_items);
    };
    /**
     * Показать что выбрано в фильтре
     */
    this.selected = function(filter_items) {
      var need = this.getChoice(),
        select = [];
      for (var i in need) {
        if (filter_items[i] && filter_items[i].length) {
          if (i == 'voice') {
            select.push(filter_translate[i] + ': ' + filter_items[i][need[i]]);
          } else if (i !== 'source') {
            if (filter_items.season.length >= 1) {
              select.push(filter_translate.season + ': ' + filter_items[i][need[i]]);
            }
          }
        }
      }
      filter.chosen('filter', select);
      filter.chosen('sort', [sources[balanser].name]);
    };
    this.getEpisodes = function(season, call) {
      var episodes = [];
	  var tmdb_id = object.movie.id;
	  if (['cub', 'tmdb'].indexOf(object.movie.source || 'tmdb') == -1) 
        tmdb_id = object.movie.tmdb_id;
      if (typeof tmdb_id == 'number' && object.movie.name) {
		  Lampa.Api.sources.tmdb.get('tv/' + tmdb_id + '/season/' + season, {}, function(data){
			  episodes = data.episodes || [];
			  
			  call(episodes);
		  }, function(){
			  call(episodes);
		  })
      } else call(episodes);
    };
    this.watched = function(set) {
      var file_id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
      var watched = Lampa.Storage.cache('online_watched_last', 5000, {});
      if (set) {
        if (!watched[file_id]) watched[file_id] = {};
        Lampa.Arrays.extend(watched[file_id], set, true);
        Lampa.Storage.set('online_watched_last', watched);
        this.updateWatched();
      } else {
        return watched[file_id];
      }
    };
    this.updateWatched = function() {
      var watched = this.watched();
      var body = scroll.body().find('.online-prestige-watched .online-prestige-watched__body').empty();
      if (watched) {
        var line = [];
        if (watched.balanser_name) line.push(watched.balanser_name);
        if (watched.voice_name) line.push(watched.voice_name);
        if (watched.season) line.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + watched.season);
        if (watched.episode) line.push(Lampa.Lang.translate('torrent_serial_episode') + ' ' + watched.episode);
        line.forEach(function(n) {
          body.append('<span>' + n + '</span>');
        });
      } else body.append('<span>' + Lampa.Lang.translate('lampac_no_watch_history') + '</span>');
    };
    /**
     * Отрисовка файлов
     */
    this.draw = function(items) {
      var _this8 = this;
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (!items.length) return this.empty();
      scroll.clear();
      scroll.append(buildGmtlopPromoElement());
      if(!object.balanser){
        scroll.append(Lampa.Template.get('lampac_prestige_watched', {}));
        this.updateWatched();
      }
      this.getEpisodes(items[0].season, function(episodes) {
        var viewed = Lampa.Storage.cache('online_view', 5000, []);
        var serial = object.movie.name ? true : false;
        var choice = _this8.getChoice();
        var fully = window.innerWidth > 480;
        var scroll_to_element = false;
        var scroll_to_mark = false;
        items.forEach(function(element, index) {
          var episode = serial && episodes.length && !params.similars ? episodes.find(function(e) {
            return e.episode_number == element.episode;
          }) : false;
          var episode_num = element.episode || index + 1;
          var episode_last = choice.episodes_view[element.season];
          var voice_name = choice.voice_name || (filter_find.voice[0] ? filter_find.voice[0].title : false) || element.voice_name || (serial ? 'Неизвестно' : element.text) || 'Неизвестно';
          if (element.quality) {
            element.qualitys = element.quality;
            element.quality = Lampa.Arrays.getKeys(element.quality)[0];
          }
          Lampa.Arrays.extend(element, {
            voice_name: voice_name,
            info: voice_name.length > 60 ? voice_name.substr(0, 60) + '...' : voice_name,
            quality: '',
            time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true)
          });
          var hash_timeline = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ':' : '', element.episode, object.movie.original_title].join('') : object.movie.original_title);
          var hash_behold = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ':' : '', element.episode, object.movie.original_title, element.voice_name].join('') : object.movie.original_title + element.voice_name);
          var data = {
            hash_timeline: hash_timeline,
            hash_behold: hash_behold
          };
          var info = [];
          if (element.season) {
            element.translate_episode_end = _this8.getLastEpisode(items);
            element.translate_voice = element.voice_name;
          }
          if (element.text && !episode) element.title = element.text;
          element.timeline = Lampa.Timeline.view(hash_timeline);
          if (episode) {
            element.title = episode.name;
            if (element.info.length < 30 && episode.vote_average) info.push(Lampa.Template.get('lampac_prestige_rate', {
              rate: parseFloat(episode.vote_average + '').toFixed(1)
            }, true));
            if (episode.air_date && fully) info.push(Lampa.Utils.parseTime(episode.air_date).full);
          } else if (object.movie.release_date && fully) {
            info.push(Lampa.Utils.parseTime(object.movie.release_date).full);
          }
          if (!serial && object.movie.tagline && element.info.length < 30) info.push(object.movie.tagline);
          if (element.info) info.push(element.info);
          if (info.length) element.info = info.map(function(i) {
            return '<span>' + i + '</span>';
          }).join('<span class="online-prestige-split">●</span>');
          var html = Lampa.Template.get('lampac_prestige_full', element);
          var loader = html.find('.online-prestige__loader');
          var image = html.find('.online-prestige__img');
		  if(object.balanser) image.hide();
          if (!serial) {
            if (choice.movie_view == hash_behold) scroll_to_element = html;
          } else if (typeof episode_last !== 'undefined' && episode_last == episode_num) {
            scroll_to_element = html;
          }
          if (serial && !episode) {
            image.append('<div class="online-prestige__episode-number">' + formatEpisodeNumber(element.episode || index + 1) + '</div>');
            loader.remove();
          }
		  else if (!serial && object.movie.backdrop_path == 'undefined') loader.remove();
          else {
            var img = html.find('img')[0];
            img.onerror = function() {
              img.src = './img/img_broken.svg';
            };
            img.onload = function() {
              image.addClass('online-prestige__img--loaded');
              loader.remove();
              if (serial) image.append('<div class="online-prestige__episode-number">' + formatEpisodeNumber(element.episode || index + 1) + '</div>');
            };
            img.src = Lampa.TMDB.image('t/p/w300' + (episode ? episode.still_path : object.movie.backdrop_path));
            images.push(img);
			element.thumbnail = img.src
          }
          html.find('.online-prestige__timeline').append(Lampa.Timeline.render(element.timeline));
          if (viewed.indexOf(hash_behold) !== -1) {
            scroll_to_mark = html;
            html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
          }
          element.mark = function() {
            viewed = Lampa.Storage.cache('online_view', 5000, []);
            if (viewed.indexOf(hash_behold) == -1) {
              viewed.push(hash_behold);
              Lampa.Storage.set('online_view', viewed);
              if (html.find('.online-prestige__viewed').length == 0) {
                html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
              }
            }
            choice = _this8.getChoice();
            if (!serial) {
              choice.movie_view = hash_behold;
            } else {
              choice.episodes_view[element.season] = episode_num;
            }
            _this8.saveChoice(choice);
            var voice_name_text = choice.voice_name || element.voice_name || element.title;
            if (voice_name_text.length > 30) voice_name_text = voice_name_text.slice(0, 30) + '...';
            _this8.watched({
              balanser: balanser,
              balanser_name: Lampa.Utils.capitalizeFirstLetter(sources[balanser] ? sources[balanser].name.split(' ')[0] : balanser),
              voice_id: choice.voice_id,
              voice_name: voice_name_text,
              episode: element.episode,
              season: element.season
            });
          };
          element.unmark = function() {
            viewed = Lampa.Storage.cache('online_view', 5000, []);
            if (viewed.indexOf(hash_behold) !== -1) {
              Lampa.Arrays.remove(viewed, hash_behold);
              Lampa.Storage.set('online_view', viewed);
              Lampa.Storage.remove('online_view', hash_behold);
              html.find('.online-prestige__viewed').remove();
            }
          };
          element.timeclear = function() {
            element.timeline.percent = 0;
            element.timeline.time = 0;
            element.timeline.duration = 0;
            Lampa.Timeline.update(element.timeline);
          };
          html.on('hover:enter', function() {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
            if (params.onEnter) params.onEnter(element, html, data);
          }).on('hover:focus', function(e) {
            last = e.target;
            if (params.onFocus) params.onFocus(element, html, data);
            scroll.update($(e.target), true);
          });
          if (params.onRender) params.onRender(element, html, data);
          _this8.contextMenu({
            html: html,
            element: element,
            onFile: function onFile(call) {
              if (params.onContextMenu) params.onContextMenu(element, html, data, call);
            },
            onClearAllMark: function onClearAllMark() {
              items.forEach(function(elem) {
                elem.unmark();
              });
            },
            onClearAllTime: function onClearAllTime() {
              items.forEach(function(elem) {
                elem.timeclear();
              });
            }
          });
          scroll.append(html);
        });
        if (serial && episodes.length > items.length && !params.similars) {
          var left = episodes.slice(items.length);
          left.forEach(function(episode) {
            var info = [];
            if (episode.vote_average) info.push(Lampa.Template.get('lampac_prestige_rate', {
              rate: parseFloat(episode.vote_average + '').toFixed(1)
            }, true));
            if (episode.air_date) info.push(Lampa.Utils.parseTime(episode.air_date).full);
            var air = new Date((episode.air_date + '').replace(/-/g, '/'));
            var now = Date.now();
            var day = Math.round((air.getTime() - now) / (24 * 60 * 60 * 1000));
            var txt = Lampa.Lang.translate('full_episode_days_left') + ': ' + day;
            var html = Lampa.Template.get('lampac_prestige_full', {
              time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true),
              info: info.length ? info.map(function(i) {
                return '<span>' + i + '</span>';
              }).join('<span class="online-prestige-split">●</span>') : '',
              title: episode.name,
              quality: day > 0 ? txt : ''
            });
            var loader = html.find('.online-prestige__loader');
            var image = html.find('.online-prestige__img');
            var season = items[0] ? items[0].season : 1;
            html.find('.online-prestige__timeline').append(Lampa.Timeline.render(Lampa.Timeline.view(Lampa.Utils.hash([season, episode.episode_number, object.movie.original_title].join('')))));
            var img = html.find('img')[0];
            if (episode.still_path) {
              img.onerror = function() {
                img.src = './img/img_broken.svg';
              };
              img.onload = function() {
                image.addClass('online-prestige__img--loaded');
                loader.remove();
                image.append('<div class="online-prestige__episode-number">' + formatEpisodeNumber(episode.episode_number) + '</div>');
              };
              img.src = Lampa.TMDB.image('t/p/w300' + episode.still_path);
              images.push(img);
            } else {
              loader.remove();
              image.append('<div class="online-prestige__episode-number">' + formatEpisodeNumber(episode.episode_number) + '</div>');
            }
            html.on('hover:focus', function(e) {
              last = e.target;
              scroll.update($(e.target), true);
            });
            html.css('opacity', '0.5');
            scroll.append(html);
          });
        }
        if (scroll_to_element) {
          last = scroll_to_element[0];
        } else if (scroll_to_mark) {
          last = scroll_to_mark[0];
        }
        Lampa.Controller.enable('content');
      });
    };
    /**
     * Меню
     */
    this.contextMenu = function(params) {
      params.html.on('hover:long', function() {
        function show(extra) {
          var enabled = Lampa.Controller.enabled().name;
          var menu = [];
          if (Lampa.Platform.is('webos')) {
            menu.push({
              title: Lampa.Lang.translate('player_lauch') + ' - Webos',
              player: 'webos'
            });
          }
          if (Lampa.Platform.is('android')) {
            menu.push({
              title: Lampa.Lang.translate('player_lauch') + ' - Android',
              player: 'android'
            });
          }
          menu.push({
            title: Lampa.Lang.translate('player_lauch') + ' - Lampa',
            player: 'lampa'
          });
          menu.push({
            title: Lampa.Lang.translate('lampac_video'),
            separator: true
          });
          menu.push({
            title: Lampa.Lang.translate('torrent_parser_label_title'),
            mark: true
          });
          menu.push({
            title: Lampa.Lang.translate('torrent_parser_label_cancel_title'),
            unmark: true
          });
          menu.push({
            title: Lampa.Lang.translate('time_reset'),
            timeclear: true
          });
          if (extra) {
            menu.push({
              title: Lampa.Lang.translate('copy_link'),
              copylink: true
            });
          }
          if (window.lampac_online_context_menu)
            window.lampac_online_context_menu.push(menu, extra, params);
          menu.push({
            title: Lampa.Lang.translate('more'),
            separator: true
          });
          if (Lampa.Account.logged() && params.element && typeof params.element.season !== 'undefined' && params.element.translate_voice) {
            menu.push({
              title: Lampa.Lang.translate('lampac_voice_subscribe'),
              subscribe: true
            });
          }
          menu.push({
            title: Lampa.Lang.translate('lampac_clear_all_marks'),
            clearallmark: true
          });
          menu.push({
            title: Lampa.Lang.translate('lampac_clear_all_timecodes'),
            timeclearall: true
          });
          Lampa.Select.show({
            title: Lampa.Lang.translate('title_action'),
            items: menu,
            onBack: function onBack() {
              Lampa.Controller.toggle(enabled);
            },
            onSelect: function onSelect(a) {
              if (a.mark) params.element.mark();
              if (a.unmark) params.element.unmark();
              if (a.timeclear) params.element.timeclear();
              if (a.clearallmark) params.onClearAllMark();
              if (a.timeclearall) params.onClearAllTime();
              if (window.lampac_online_context_menu)
                window.lampac_online_context_menu.onSelect(a, params);
              Lampa.Controller.toggle(enabled);
              if (a.player) {
                Lampa.Player.runas(a.player);
                params.html.trigger('hover:enter');
              }
              if (a.copylink) {
                if (extra.quality) {
                  var qual = [];
                  for (var i in extra.quality) {
                    qual.push({
                      title: i,
                      file: extra.quality[i]
                    });
                  }
                  Lampa.Select.show({
                    title: Lampa.Lang.translate('settings_server_links'),
                    items: qual,
                    onBack: function onBack() {
                      Lampa.Controller.toggle(enabled);
                    },
                    onSelect: function onSelect(b) {
                      Lampa.Utils.copyTextToClipboard(b.file, function() {
                        Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'));
                      }, function() {
                        Lampa.Noty.show(Lampa.Lang.translate('copy_error'));
                      });
                    }
                  });
                } else {
                  Lampa.Utils.copyTextToClipboard(extra.file, function() {
                    Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'));
                  }, function() {
                    Lampa.Noty.show(Lampa.Lang.translate('copy_error'));
                  });
                }
              }
              if (a.subscribe) {
                Lampa.Account.subscribeToTranslation({
                  card: object.movie,
                  season: params.element.season,
                  episode: params.element.translate_episode_end,
                  voice: params.element.translate_voice
                }, function() {
                  Lampa.Noty.show(Lampa.Lang.translate('lampac_voice_success'));
                }, function() {
                  Lampa.Noty.show(Lampa.Lang.translate('lampac_voice_error'));
                });
              }
            }
          });
        }
        params.onFile(show);
      }).on('hover:focus', function() {
        if (Lampa.Helper) Lampa.Helper.show('online_file', Lampa.Lang.translate('helper_online_file'), params.html);
      });
    };
    /**
     * Показать пустой результат
     */
    this.empty = function() {
      var html = Lampa.Template.get('lampac_does_not_answer', {});
      html.find('.online-empty__buttons').remove();
      html.find('.online-empty__title').text(Lampa.Lang.translate('empty_title_two'));
      html.find('.online-empty__time').text(Lampa.Lang.translate('empty_text'));
      scroll.clear();
      scroll.append(html);
      this.loading(false);
    };
    this.noConnectToServer = function(er) {
      var html = Lampa.Template.get('lampac_does_not_answer', {});
      html.find('.online-empty__buttons').remove();
      html.find('.online-empty__title').text(Lampa.Lang.translate('title_error'));
      html.find('.online-empty__time').text(er && er.accsdb ? er.msg : Lampa.Lang.translate('lampac_does_not_answer_text').replace('{balanser}', balanser[balanser].name));
      scroll.clear();
      scroll.append(html);
      this.loading(false);
    };
    this.doesNotAnswer = function(er) {
      var _this9 = this;
      this.reset();
      var html = Lampa.Template.get('lampac_does_not_answer', {
        balanser: balanser
      });
      if(er && er.accsdb) html.find('.online-empty__title').html(er.msg);
	  
      var tic = er && er.accsdb ? 10 : 5;
      html.find('.cancel').on('hover:enter', function() {
        clearInterval(balanser_timer);
      });
      html.find('.change').on('hover:enter', function() {
        clearInterval(balanser_timer);
        filter.render().find('.filter--sort').trigger('hover:enter');
      });
      scroll.clear();
      scroll.append(html);
      this.loading(false);
      balanser_timer = setInterval(function() {
        tic--;
        html.find('.timeout').text(tic);
        if (tic == 0) {
          clearInterval(balanser_timer);
          var keys = Lampa.Arrays.getKeys(sources);
          var indx = keys.indexOf(balanser);
          var next = keys[indx + 1];
          if (!next) next = keys[0];
          balanser = next;
          if (Lampa.Activity.active().activity == _this9.activity) _this9.changeBalanser(balanser);
        }
      }, 1000);
    };
    this.getLastEpisode = function(items) {
      var last_episode = 0;
      items.forEach(function(e) {
        if (typeof e.episode !== 'undefined') last_episode = Math.max(last_episode, parseInt(e.episode));
      });
      return last_episode;
    };
    /**
     * Начать навигацию по файлам
     */
    this.start = function() {
      if (Lampa.Activity.active().activity !== this.activity) return;
      if (!initialized) {
        initialized = true;
        this.initialize();
      }
      Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(object.movie));
      Lampa.Controller.add('content', {
        toggle: function toggle() {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        gone: function gone() {
          clearTimeout(balanser_timer);
        },
        up: function up() {
          if (Navigator.canmove('up')) {
            Navigator.move('up');
          } else Lampa.Controller.toggle('head');
        },
        down: function down() {
          Navigator.move('down');
        },
        right: function right() {
          if (Navigator.canmove('right')) Navigator.move('right');
          else filter.show(Lampa.Lang.translate('title_filter'), 'filter');
        },
        left: function left() {
          if (Navigator.canmove('left')) Navigator.move('left');
          else Lampa.Controller.toggle('menu');
        },
        back: this.back.bind(this)
      });
      Lampa.Controller.toggle('content');
    };
    this.render = function() {
      return files.render();
    };
    this.back = function() {
      Lampa.Activity.backward();
    };
    this.pause = function() {};
    this.stop = function() {};
    this.destroy = function() {
      network.clear();
      this.clearImages();
      files.destroy();
      scroll.destroy();
      clearInterval(balanser_timer);
      clearTimeout(life_wait_timer);
    };
  }
  
  function addSourceSearch(spiderName, spiderUri) {
    var network = new Lampa.Reguest();

    var source = {
      title: spiderName,
      search: function(params, oncomplite) {
        function searchComplite(links) {
          var keys = Lampa.Arrays.getKeys(links);

          if (keys.length) {
            var status = new Lampa.Status(keys.length);

            status.onComplite = function(result) {
              var rows = [];

              keys.forEach(function(name) {
                var line = result[name];

                if (line && line.data && line.type == 'similar') {
                  var cards = line.data.map(function(item) {
                    item.title = Lampa.Utils.capitalizeFirstLetter(item.title);
                    item.release_date = item.year || '0000';
                    item.balanser = spiderUri;
                    if (item.img !== undefined) {
                      if (item.img.charAt(0) === '/')
                        item.img = Defined.localhost + item.img.substring(1);
                      if (item.img.indexOf('/proxyimg') !== -1)
                        item.img = account(item.img);
                    }

                    return item;
                  })

                  rows.push({
                    title: name,
                    results: cards
                  })
                }
              })

              oncomplite(rows);
            }

            keys.forEach(function(name) {
              network.silent(account(links[name]), function(data) {
                status.append(name, data);
              }, function() {
                status.error();
              }, false, {
                  headers: addHeaders()
		  })
            })
          } else {
            oncomplite([]);
          }
        }

        network.silent(account(Defined.localhost + 'lite/' + spiderUri + '?title=' + params.query), function(json) {
          if (json.rch) {
            rchRun(json, function() {
              network.silent(account(Defined.localhost + 'lite/' + spiderUri + '?title=' + params.query), function(links) {
                searchComplite(links);
              }, function() {
                oncomplite([]);
              }, false, {
                  headers: addHeaders()
		  });
            });
          } else {
            searchComplite(json);
          }
        }, function() {
          oncomplite([]);
        }, false, {
            headers: addHeaders()
		  });
      },
      onCancel: function() {
        network.clear()
      },
      params: {
        lazy: true,
        align_left: true,
        card_events: {
          onMenu: function() {}
        }
      },
      onMore: function(params, close) {
        close();
      },
      onSelect: function(params, close) {
        close();

        Lampa.Activity.push({
          url: params.element.url,
          title: 'Смотреть онлайн - ' + params.element.title,
          component: 'dolpac',
          movie: params.element,
          page: 1,
          search: params.element.title,
          clarification: true,
          balanser: params.element.balanser,
          noinfo: true
        });
      }
    }

    Lampa.Search.addSource(source)
  }


  function injectGmtlopPromoStyles() {
    if ($('#gmtlop_promo_styles').length) return;

    $('head').append(
      '<style id="gmtlop_promo_styles">' +
        '.gmtlop-promo{' +
          'display:flex;' +
          'align-items:center;' +
          'justify-content:space-between;' +
          'gap:.9em;' +
          'margin:0 0 .9em 0;' +
          'padding:.72em .9em;' +
          'border-radius:.75em;' +
          'background:rgba(15,18,24,.42);' +
          'border:1px solid rgba(255,255,255,.06);' +
          'box-sizing:border-box;' +
          'backdrop-filter:blur(6px);' +
        '}' +
        '.gmtlop-promo__body{' +
          'min-width:0;' +
          'flex:1;' +
        '}' +
        '.gmtlop-promo__label{' +
          'display:inline-block;' +
          'margin-bottom:.35em;' +
          'padding:.18em .55em;' +
          'border-radius:999px;' +
          'font-size:.82em;' +
          'font-weight:600;' +
          'background:rgba(255,255,255,.08);' +
          'color:rgba(255,255,255,.92);' +
        '}' +
        '.gmtlop-promo__title{' +
          'font-size:1.02em;' +
          'font-weight:700;' +
          'line-height:1.25;' +
          'color:#fff;' +
        '}' +
        '.gmtlop-promo__text{' +
          'margin-top:.28em;' +
          'font-size:.88em;' +
          'line-height:1.35;' +
          'color:rgba(255,255,255,.74);' +
        '}' +
        '.gmtlop-promo__side{' +
          'flex-shrink:0;' +
          'display:flex;' +
          'flex-direction:column;' +
          'align-items:center;' +
          'gap:.28em;' +
        '}' +
        '.gmtlop-promo__qr{' +
          'display:block;' +
          'width:4.2em;' +
          'height:4.2em;' +
          'padding:.22em;' +
          'border-radius:.55em;' +
          'background:#fff;' +
          'box-sizing:border-box;' +
        '}' +
        '.gmtlop-promo__hint{' +
          'font-size:.72em;' +
          'color:rgba(255,255,255,.58);' +
          'white-space:nowrap;' +
        '}' +
        '@media screen and (max-width:480px){' +
          '.gmtlop-promo{' +
            'padding:.65em .75em;' +
            'gap:.7em;' +
          '}' +
          '.gmtlop-promo__title{' +
            'font-size:.94em;' +
          '}' +
          '.gmtlop-promo__text{' +
            'font-size:.8em;' +
          '}' +
          '.gmtlop-promo__qr{' +
            'width:3.5em;' +
            'height:3.5em;' +
          '}' +
        '}' +
      '</style>'
    );
  }

  function buildGmtlopPromoElement() {
	  
	var qrImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALkAAAC5CAIAAAD7zwkLAAADWUlEQVR42u3dy27DMAxE0bro//9yuu/CiMohrdjnbovED1xQU4WSjtfr9QW8wbdXAK6AK+AKuAKugCsAV8AVcAVcAVfAFYAr4Aq4Aq6AK+AKHshP5cPHcczc5Z+m4KXrnn/2vN34/EJLn61cqO9NqiswBoEr4Apk24bcVAmVwai7SaYee5PqCoxB4Aq4Atm2IVUtpbm+6dQ/fz2/0NJXVeJq35tUV8AVcAVcgWx7NZUgvPTZsQupK+AKuAJwBU/NtsGMWZmZfVrUVVfAFXAFXMGDs21fmqv0kF6VfMemj9UVcAVcAVcg214dOYMhui/57tlgq66AK+AKuAIksu1V84lLYTbYVzD2ROoKjEHgCsAVjGfbvnnMpZ0QlpoBgnsO9HXUBrsdgjeproAr4Aq4gltn26uORah81Z4/9we7cfseUF0BV8AVcAW3zrZLgbQv+QZPWFi652CoDJ5a1hd11RVwBVwBV7A7xyZHYF2Vi6/aqWvsiDN1BcYgcAVcwYNo7LethLtKD2nlqLFKTA6+nMr/AX23oa6AK+AKuIJbZ9sgfZtvVdLcUkxeith9nQP6bWEMAlfAFci2m6XX4KxuhfNcvHTd4Lq74F2pKzAGgSvgCmTb9yLYWBLsWzwW7CBeSutBgr0Q6gq4Aq6AK3hSth1b4hWMun0dtWPTx0sPqN8WxiBwBVyBbPvJYfYjjvyqMLZjr7oCroAr4ApunW2DobLSjhpcLXb+gJvE5OCOaOoKjEHgCriCW3H05bXgZGvf7/vB9Bpsb6jkcXUFxiBwBVzBc5mbt620wY5NTQYjZ3BZWuWfBmvJYAwCV8AVPIjjE9tR+zbQCobKpSA8FrGtJYMxCFwBV3BnGudtgwTnbfsSaOUmx/qL1RVwBVwBVyDbNiTBSgLtOwcheEBvMBerKzAGgSvgCvBeINvzN/pN+m03Wf+2SS5WV8AVcAVcwe783OAZxkJlcF/dYHgf295XXQFXwBVwBbJtA32H7C5NH/cdXRF8ImvJYAwCV8AVyLYJ+n4rH9tdLPgIwe0LKolbXYExCFwBVyDb/itz9dG30qwvF1deTl8QVldgDAJXwBXcio/c3xbqCrgCroArAFfAFXAFXAFXwBWAK+AKuAKugCvgCrgCcAVcwRC/ZN0ssS8g6m4AAAAASUVORK5CYII=';

    return $(
      '<div class="gmtlop-promo selector" data-action="open-gmtlop">' +
        '<div class="gmtlop-promo__body">' +
          '<div class="gmtlop-promo__label">Telegram · GMTLOP</div>' +
          '<div class="gmtlop-promo__title">Подпишитесь на Telegram-канал, чтобы не потерять доступ к плагину</div>' +
          '<div class="gmtlop-promo__text">В канале будут публиковаться важные обновления и резервная информация на случай изменений или переезда.</div>' +
        '</div>' +
        '<div class="gmtlop-promo__side">' +
          '<img class="gmtlop-promo__qr" src="' + qrImage + '" alt="QR"/>' +
          '<div class="gmtlop-promo__hint">gmtlop</div>' +
        '</div>' +
      '</div>'
    ).on('hover:enter click', function() {
      if (Lampa.Utils && Lampa.Utils.openWindow) Lampa.Utils.openWindow('https://t.me/+2VP2ePMEYKJkMWNi');
      else window.open('https://t.me/+2VP2ePMEYKJkMWNi', '_blank');
    });
  }

  function startPlugin() {
    window.dolpac_plugin = true;
    lampacGaInit();
    injectGmtlopPromoStyles();
    var manifst = {
      type: 'video',
      version: '',
      name: 'GMTLOP',
      description: 'Плагин для просмотра онлайн сериалов и фильмов',
      component: 'dolpac',
      onContextMenu: function onContextMenu(object) {
        return {
          name: Lampa.Lang.translate('lampac_watch'),
          description: ''
        };
      },
      onContextLauch: function onContextLauch(object) {
        resetTemplates();
        Lampa.Component.add('dolpac', component);

        var gaParams = lampacGaMovieParams(object);
        gaParams.open_method = 'context_menu';
        lampacGaEvent('lampac_open_online', gaParams);
        gaParams.page_path = lampacMoviePagePath(object);
        gaParams.page_location = lampacGaLocation(gaParams.page_path);
        gaParams.page_title = lampacMovieSeoTitle(object);
        lampacGaPage(gaParams.page_title, gaParams);
		
		var id = Lampa.Utils.hash(object.number_of_seasons ? object.original_name : object.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('title_online'),
          component: 'dolpac',
          search: all[id] ? all[id] : object.title,
          search_one: object.title,
          search_two: object.original_title,
          movie: object,
          page: 1,
		  clarification: all[id] ? true : false
        });
      }
    };
	addSourceSearch('GMTLOP NextGen', 'spider');
	addSourceSearch('GMTLOP NextGen - Anime', 'spider/anime');
    Lampa.Manifest.plugins = manifst;
    Lampa.Lang.add({
      lampac_watch: { //
        ru: 'Смотреть онлайн',
        en: 'Watch online',
        uk: 'Дивитися онлайн',
        zh: '在线观看'
      },
      lampac_video: { //
        ru: 'Видео',
        en: 'Video',
        uk: 'Відео',
        zh: '视频'
      },
      lampac_no_watch_history: {
        ru: 'Нет истории просмотра',
        en: 'No browsing history',
        ua: 'Немає історії перегляду',
        zh: '没有浏览历史'
      },
      lampac_nolink: {
        ru: 'Не удалось извлечь ссылку',
        uk: 'Неможливо отримати посилання',
        en: 'Failed to fetch link',
        zh: '获取链接失败'
      },
      lampac_balanser: { //
        ru: 'Источник',
        uk: 'Джерело',
        en: 'Source',
        zh: '来源'
      },
      helper_online_file: { //
        ru: 'Удерживайте клавишу "ОК" для вызова контекстного меню',
        uk: 'Утримуйте клавішу "ОК" для виклику контекстного меню',
        en: 'Hold the "OK" key to bring up the context menu',
        zh: '按住“确定”键调出上下文菜单'
      },
      title_online: { //
        ru: 'Онлайн',
        uk: 'Онлайн',
        en: 'Online',
        zh: '在线的'
      },
      lampac_voice_subscribe: { //
        ru: 'Подписаться на перевод',
        uk: 'Підписатися на переклад',
        en: 'Subscribe to translation',
        zh: '订阅翻译'
      },
      lampac_voice_success: { //
        ru: 'Вы успешно подписались',
        uk: 'Ви успішно підписалися',
        en: 'You have successfully subscribed',
        zh: '您已成功订阅'
      },
      lampac_voice_error: { //
        ru: 'Возникла ошибка',
        uk: 'Виникла помилка',
        en: 'An error has occurred',
        zh: '发生了错误'
      },
      lampac_clear_all_marks: { //
        ru: 'Очистить все метки',
        uk: 'Очистити всі мітки',
        en: 'Clear all labels',
        zh: '清除所有标签'
      },
      lampac_clear_all_timecodes: { //
        ru: 'Очистить все тайм-коды',
        uk: 'Очистити всі тайм-коди',
        en: 'Clear all timecodes',
        zh: '清除所有时间代码'
      },
      lampac_change_balanser: { //
        ru: 'Изменить балансер',
        uk: 'Змінити балансер',
        en: 'Change balancer',
        zh: '更改平衡器'
      },
      lampac_balanser_dont_work: { //
        ru: 'Поиск на ({balanser}) не дал результатов',
        uk: 'Пошук на ({balanser}) не дав результатів',
        en: 'Search on ({balanser}) did not return any results',
        zh: '搜索 ({balanser}) 未返回任何结果'
      },
      lampac_balanser_timeout: { //
        ru: 'Источник будет переключен автоматически через <span class="timeout">10</span> секунд.',
        uk: 'Джерело буде автоматично переключено через <span class="timeout">10</span> секунд.',
        en: 'The source will be switched automatically after <span class="timeout">10</span> seconds.',
        zh: '平衡器将在<span class="timeout">10</span>秒内自动切换。'
      },
      lampac_does_not_answer_text: {
        ru: 'Поиск на ({balanser}) не дал результатов',
        uk: 'Пошук на ({balanser}) не дав результатів',
        en: 'Search on ({balanser}) did not return any results',
        zh: '搜索 ({balanser}) 未返回任何结果'
      }
    });
    Lampa.Template.add('lampac_css', "\n        <style>\n        @charset 'UTF-8';.online-prestige{position:relative;-webkit-border-radius:.3em;border-radius:.3em;background-color:rgba(0,0,0,0.3);display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.online-prestige__body{padding:1.2em;line-height:1.3;-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;position:relative}@media screen and (max-width:480px){.online-prestige__body{padding:.8em 1.2em}}.online-prestige__img{position:relative;width:13em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;min-height:8.2em}.online-prestige__img>img{position:absolute;top:0;left:0;width:100%;height:100%;-o-object-fit:cover;object-fit:cover;-webkit-border-radius:.3em;border-radius:.3em;opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}.online-prestige__img--loaded>img{opacity:1}@media screen and (max-width:480px){.online-prestige__img{width:7em;min-height:6em}}.online-prestige__folder{padding:1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.online-prestige__folder>svg{width:4.4em !important;height:4.4em !important}.online-prestige__viewed{position:absolute;top:1em;left:1em;background:rgba(0,0,0,0.45);-webkit-border-radius:100%;border-radius:100%;padding:.25em;font-size:.76em}.online-prestige__viewed>svg{width:1.5em !important;height:1.5em !important}.online-prestige__episode-number{position:absolute;top:0;left:0;right:0;bottom:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;font-size:2em}.online-prestige__loader{position:absolute;top:50%;left:50%;width:2em;height:2em;margin-left:-1em;margin-top:-1em;background:url(./img/loader.svg) no-repeat center center;-webkit-background-size:contain;-o-background-size:contain;background-size:contain}.online-prestige__head,.online-prestige__footer{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-webkit-justify-content:space-between;-moz-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige__timeline{margin:.8em 0}.online-prestige__timeline>.time-line{display:block !important}.online-prestige__title{font-size:1.7em;overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical}@media screen and (max-width:480px){.online-prestige__title{font-size:1.4em}}.online-prestige__time{padding-left:2em}.online-prestige__info{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige__info>*{overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical}.online-prestige__quality{padding-left:1em;white-space:nowrap}.online-prestige__scan-file{position:absolute;bottom:0;left:0;right:0}.online-prestige__scan-file .broadcast__scan{margin:0}.online-prestige .online-prestige-split{font-size:.8em;margin:0 1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.online-prestige.focus::after{content:'';position:absolute;top:-0.6em;left:-0.6em;right:-0.6em;bottom:-0.6em;-webkit-border-radius:.7em;border-radius:.7em;border:solid .3em #fff;z-index:-1;pointer-events:none}.online-prestige+.online-prestige{margin-top:1.5em}.online-prestige--folder .online-prestige__footer{margin-top:.8em}.online-prestige-watched{padding:1em}.online-prestige-watched__icon>svg{width:1.5em;height:1.5em}.online-prestige-watched__body{padding-left:1em;padding-top:.1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap}.online-prestige-watched__body>span+span::before{content:' ● ';vertical-align:top;display:inline-block;margin:0 .5em}.online-prestige-rate{display:-webkit-inline-box;display:-webkit-inline-flex;display:-moz-inline-box;display:-ms-inline-flexbox;display:inline-flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige-rate>svg{width:1.3em !important;height:1.3em !important}.online-prestige-rate>span{font-weight:600;font-size:1.1em;padding-left:.7em}.online-empty{line-height:1.4}.online-empty__title{font-size:1.8em;margin-bottom:.3em}.online-empty__time{font-size:1.2em;font-weight:300;margin-bottom:1.6em}.online-empty__buttons{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.online-empty__buttons>*+*{margin-left:1em}.online-empty__button{background:rgba(0,0,0,0.3);font-size:1.2em;padding:.5em 1.2em;-webkit-border-radius:.2em;border-radius:.2em;margin-bottom:2.4em}.online-empty__button.focus{background:#fff;color:black}.online-empty__templates .online-empty-template:nth-child(2){opacity:.5}.online-empty__templates .online-empty-template:nth-child(3){opacity:.2}.online-empty-template{background-color:rgba(255,255,255,0.3);padding:1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-border-radius:.3em;border-radius:.3em}.online-empty-template>*{background:rgba(0,0,0,0.3);-webkit-border-radius:.3em;border-radius:.3em}.online-empty-template__ico{width:4em;height:4em;margin-right:2.4em}.online-empty-template__body{height:1.7em;width:70%}.online-empty-template+.online-empty-template{margin-top:1em}\n        </style>\n    ");
    $('body').append(Lampa.Template.get('lampac_css', {}, true));

    function resetTemplates() {
      Lampa.Template.add('lampac_prestige_full', "<div class=\"online-prestige online-prestige--full selector\">\n            <div class=\"online-prestige__img\">\n                <img alt=\"\">\n                <div class=\"online-prestige__loader\"></div>\n            </div>\n            <div class=\"online-prestige__body\">\n                <div class=\"online-prestige__head\">\n                    <div class=\"online-prestige__title\">{title}</div>\n                    <div class=\"online-prestige__time\">{time}</div>\n                </div>\n\n                <div class=\"online-prestige__timeline\"></div>\n\n                <div class=\"online-prestige__footer\">\n                    <div class=\"online-prestige__info\">{info}</div>\n                    <div class=\"online-prestige__quality\">{quality}</div>\n                </div>\n            </div>\n        </div>");
      Lampa.Template.add('lampac_content_loading', "<div class=\"online-empty\">\n            <div class=\"broadcast__scan\"><div></div></div>\n\t\t\t\n            <div class=\"online-empty__templates\">\n                <div class=\"online-empty-template selector\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n            </div>\n        </div>");
      Lampa.Template.add('lampac_does_not_answer', "<div class=\"online-empty\">\n            <div class=\"online-empty__title\">\n                #{lampac_balanser_dont_work}\n            </div>\n            <div class=\"online-empty__time\">\n                #{lampac_balanser_timeout}\n            </div>\n            <div class=\"online-empty__buttons\">\n                <div class=\"online-empty__button selector cancel\">#{cancel}</div>\n                <div class=\"online-empty__button selector change\">#{lampac_change_balanser}</div>\n            </div>\n            <div class=\"online-empty__templates\">\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n            </div>\n        </div>");
      Lampa.Template.add('lampac_prestige_rate', "<div class=\"online-prestige-rate\">\n            <svg width=\"17\" height=\"16\" viewBox=\"0 0 17 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                <path d=\"M8.39409 0.192139L10.99 5.30994L16.7882 6.20387L12.5475 10.4277L13.5819 15.9311L8.39409 13.2425L3.20626 15.9311L4.24065 10.4277L0 6.20387L5.79819 5.30994L8.39409 0.192139Z\" fill=\"#fff\"></path>\n            </svg>\n            <span>{rate}</span>\n        </div>");
      Lampa.Template.add('lampac_prestige_folder', "<div class=\"online-prestige online-prestige--folder selector\">\n            <div class=\"online-prestige__folder\">\n                <svg viewBox=\"0 0 128 112\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <rect y=\"20\" width=\"128\" height=\"92\" rx=\"13\" fill=\"white\"></rect>\n                    <path d=\"M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z\" fill=\"white\" fill-opacity=\"0.23\"></path>\n                    <rect x=\"11\" y=\"8\" width=\"106\" height=\"76\" rx=\"13\" fill=\"white\" fill-opacity=\"0.51\"></rect>\n                </svg>\n            </div>\n            <div class=\"online-prestige__body\">\n                <div class=\"online-prestige__head\">\n                    <div class=\"online-prestige__title\">{title}</div>\n                    <div class=\"online-prestige__time\">{time}</div>\n                </div>\n\n                <div class=\"online-prestige__footer\">\n                    <div class=\"online-prestige__info\">{info}</div>\n                </div>\n            </div>\n        </div>");
      Lampa.Template.add('lampac_prestige_watched', "<div class=\"online-prestige online-prestige-watched selector\">\n            <div class=\"online-prestige-watched__icon\">\n                <svg width=\"21\" height=\"21\" viewBox=\"0 0 21 21\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <circle cx=\"10.5\" cy=\"10.5\" r=\"9\" stroke=\"currentColor\" stroke-width=\"3\"/>\n                    <path d=\"M14.8477 10.5628L8.20312 14.399L8.20313 6.72656L14.8477 10.5628Z\" fill=\"currentColor\"/>\n                </svg>\n            </div>\n            <div class=\"online-prestige-watched__body\">\n                \n            </div>\n        </div>");
    }
    var button = "<div class=\"full-start__button selector view--online lampac--button\" data-subtitle=\"".concat(manifst.name, " ").concat(manifst.version, "\">\n        <svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 392.697 392.697\" xml:space=\"preserve\">\n            <path d=\"M21.837,83.419l36.496,16.678L227.72,19.886c1.229-0.592,2.002-1.846,1.98-3.209c-0.021-1.365-0.834-2.592-2.082-3.145\n                L197.766,0.3c-0.903-0.4-1.933-0.4-2.837,0L21.873,77.036c-1.259,0.559-2.073,1.803-2.081,3.18\n                C19.784,81.593,20.584,82.847,21.837,83.419z\" fill=\"currentColor\"></path>\n            <path d=\"M185.689,177.261l-64.988-30.01v91.617c0,0.856-0.44,1.655-1.167,2.114c-0.406,0.257-0.869,0.386-1.333,0.386\n                c-0.368,0-0.736-0.082-1.079-0.244l-68.874-32.625c-0.869-0.416-1.421-1.293-1.421-2.256v-92.229L6.804,95.5\n                c-1.083-0.496-2.344-0.406-3.347,0.238c-1.002,0.645-1.608,1.754-1.608,2.944v208.744c0,1.371,0.799,2.615,2.045,3.185\n                l178.886,81.768c0.464,0.211,0.96,0.315,1.455,0.315c0.661,0,1.318-0.188,1.892-0.555c1.002-0.645,1.608-1.754,1.608-2.945\n                V180.445C187.735,179.076,186.936,177.831,185.689,177.261z\" fill=\"currentColor\"></path>\n            <path d=\"M389.24,95.74c-1.002-0.644-2.264-0.732-3.347-0.238l-178.876,81.76c-1.246,0.57-2.045,1.814-2.045,3.185v208.751\n                c0,1.191,0.606,2.302,1.608,2.945c0.572,0.367,1.23,0.555,1.892,0.555c0.495,0,0.991-0.104,1.455-0.315l178.876-81.768\n                c1.246-0.568,2.045-1.813,2.045-3.185V98.685C390.849,97.494,390.242,96.384,389.24,95.74z\" fill=\"currentColor\"></path>\n            <path d=\"M372.915,80.216c-0.009-1.377-0.823-2.621-2.082-3.18l-60.182-26.681c-0.938-0.418-2.013-0.399-2.938,0.045\n                l-173.755,82.992l60.933,29.117c0.462,0.211,0.958,0.316,1.455,0.316s0.993-0.105,1.455-0.316l173.066-79.092\n                C372.122,82.847,372.923,81.593,372.915,80.216z\" fill=\"currentColor\"></path>\n        </svg>\n\n        <span>#{title_online}</span>\n    </div>"); // нужна заглушка, а то при страте лампы говорит пусто
    Lampa.Component.add('dolpac', component); //то же самое
    resetTemplates();

    function addButton(e) {
      if (e.render.find('.lampac--button').length) return;
      var btn = $(Lampa.Lang.translate(button));
	  // //console.log(btn.clone().removeClass('focus').prop('outerHTML'))
      btn.on('hover:enter', function() {
        resetTemplates();
        Lampa.Component.add('dolpac', component);

        var gaParams = lampacGaMovieParams(e.movie);
        gaParams.open_method = 'button';
        lampacGaEvent('lampac_open_online', gaParams);
        gaParams.page_path = lampacMoviePagePath(e.movie);
        gaParams.page_location = lampacGaLocation(gaParams.page_path);
        gaParams.page_title = lampacMovieSeoTitle(e.movie);
        lampacGaPage(gaParams.page_title, gaParams);
		
		var id = Lampa.Utils.hash(e.movie.number_of_seasons ? e.movie.original_name : e.movie.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('title_online'),
          component: 'dolpac',
          search: all[id] ? all[id] : e.movie.title,
          search_one: e.movie.title,
          search_two: e.movie.original_title,
          movie: e.movie,
          page: 1,
		  clarification: all[id] ? true : false
        });
      });
      e.render.after(btn);
    }
    Lampa.Listener.follow('full', function(e) {
      if (e.type == 'complite') {
        addButton({
          render: e.object.activity.render().find('.view--torrent'),
          movie: e.data.movie
        });
      }
    });
    try {
      if (Lampa.Activity.active().component == 'full') {
        addButton({
          render: Lampa.Activity.active().activity.render().find('.view--torrent'),
          movie: Lampa.Activity.active().card
        });
      }
    } catch (e) {}
    if (Lampa.Manifest.app_digital >= 177) {
        var balansers_sync = ["filmix", 'filmixtv', "fxapi", "rezka", "rhsprem", "lumex", "videodb", "collaps", "collaps-dash", "hdvb", "zetflix", "kodik", "ashdi", "kinoukr", "kinotochka", "remux", "iframevideo", "cdnmovies", "anilibria", "animedia", "animego", "animevost", "animebesst", "redheadsound", "alloha", "animelib", "moonanime", "kinopub", "vibix", "vdbmovies", "fancdn", "cdnvideohub", "vokino", "rc/filmix", "rc/fxapi", "rc/rhs", "vcdn", "videocdn", "mirage", "hydraflix", "videasy", "vidsrc", "movpi", "vidlink", "twoembed", "autoembed", "smashystream", "autoembed", "rgshows", "pidtor", "videoseed", "iptvonline", "veoveo", "kinoflix"];
      balansers_sync.forEach(function(name) {
        Lampa.Storage.sync('online_choice_' + name, 'object_object');
      });
      Lampa.Storage.sync('online_watched_last', 'object_object');
    }
  }
  if (!window.dolpac_plugin) startPlugin();

})();
