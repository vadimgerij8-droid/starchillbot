(function () {
    'use strict';

    // ===== CONFIG =====
    var PROXY_URL   = 'https://monoanime.animegran8.workers.dev'; // ваш Workers-проксі
    var ANIMEUA_BASE = 'https://animeua.club';

    var GENRE_MAP = {
        "Бойові мистецтва": "boivie",
        "Бойовики":         "boyovik",
        "Воєнні":           "voenne",
        "Гарем":            "garems",
        "Драми":            "drama",
        "Детектив":         "detektiv",
        "Демони":           "demons",
        "Комедії":          "komik",
        "Роботи":           "meha",
        "Повсякденність":   "posyardnevnist",
        "Пригоди":          "adventures",
        "Психологічні":     "psih",
        "Романтика":        "romantik",
        "Надприродні":      "weird",
        "Фантастика":       "fantastika",
        "Фентезі":          "fentezi",
        "Школа":            "classes",
        "Еччі":             "echhi"
    };

    var network = new Lampa.Reguest();

    // ===== HELPERS =====
    function proxyUrl(url) {
        return PROXY_URL + '?url=' + encodeURIComponent(url);
    }

    function safeHashCode(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    // ===== HTML PARSER =====
    function parseHtml(html) {
        var parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
    }

    function parseCards(doc) {
        var cards   = doc.querySelectorAll('.poster');
        var results = [];

        if (cards.length) {
            cards.forEach(function (card) {
                var linkEl  = card.tagName === 'A' ? card : card.querySelector('a');
                var href    = linkEl ? (linkEl.getAttribute('href') || '') : '';
                var img     = card.querySelector('img');
                var poster  = img ? (img.getAttribute('data-src') || img.getAttribute('src') || '') : '';
                var titleEl = card.querySelector('.poster__title') || card.querySelector('h3');
                var title   = titleEl ? titleEl.textContent.trim() : 'Без назви';
                var url     = href.startsWith('http') ? href : ANIMEUA_BASE + href;
                if (!poster.startsWith('http') && poster) poster = ANIMEUA_BASE + poster;

                results.push({
                    id:        safeHashCode(url),
                    title:     title,
                    poster:    poster,
                    url:       url,
                    source:    'monoanime'
                });
            });
        }
        return results;
    }

    // ===== NETWORK =====
    function fetchPage(url, callback, onerror) {
        network.silent(proxyUrl(url), function (html) {
            try {
                var doc = parseHtml(html);
                callback(doc);
            } catch (e) {
                onerror(e);
            }
        }, onerror);
    }

    function getPage(pageNum, genreSlug, searchQuery, callback, onerror) {
        var url;
        if (searchQuery) {
            url = ANIMEUA_BASE + '/index.php?do=search&subaction=search&story=' + encodeURIComponent(searchQuery) + '&page=' + pageNum;
        } else if (genreSlug) {
            url = pageNum > 1
                ? ANIMEUA_BASE + '/' + genreSlug + '/page/' + pageNum + '/'
                : ANIMEUA_BASE + '/' + genreSlug + '/';
        } else {
            url = pageNum > 1
                ? ANIMEUA_BASE + '/page/' + pageNum + '/'
                : ANIMEUA_BASE + '/';
        }

        fetchPage(url, function (doc) {
            var items = parseCards(doc);
            callback(items);
        }, onerror);
    }

    // ===== DETAIL PARSER =====
    function extractSources(html, providerName) {
        var sources = [];
        var jsonMatch = html.match(/file\s*:\s*(\[[\s\S]+?\])/i)
                     || html.match(/playlist\s*:\s*(\[[\s\S]+?\])/i);

        if (jsonMatch) {
            try {
                var raw = jsonMatch[1].replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');
                var arr = JSON.parse(raw);

                function walk(items, dub, season) {
                    if (!season) season = '1';
                    items.forEach(function (item) {
                        if (item.folder || item.playlist) {
                            var nd = dub || providerName || 'UA';
                            var ns = season;
                            var ft = item.title || '';
                            var sm = ft.match(/[Сс]езон\s*(\d+)/);
                            if (sm) { ns = sm[1]; } else if (ft) { nd = ft; }
                            walk(item.folder || item.playlist, nd, ns);
                        } else if (item.file) {
                            var epTitle = item.title || 'Серія';
                            var epm = epTitle.match(/(\d+)\s*[Сс]ері[яіяа]|[Сс]ері[яіяа]\s*(\d+)|Еп\.?\s*(\d+)/);
                            var epNum = epm ? (epm[1] || epm[2] || epm[3]) : '1';
                            sources.push({
                                label:   epTitle,
                                file:    item.file,
                                dub:     (dub || providerName || 'UA').trim(),
                                season:  season,
                                episode: epNum
                            });
                        }
                    });
                }

                if (Array.isArray(arr)) walk(arr, '', '1');
            } catch (e) {
                console.log('MonoAnime', 'JSON parse error', e);
            }
        }

        if (!sources.length) {
            var urlMatches = html.match(/https?:\/\/[^\s'"<>]+\.m3u8[^\s'"<>]*/g) || [];
            urlMatches.forEach(function (m, idx) {
                sources.push({ label: 'Потік ' + (idx + 1), file: m, dub: providerName || 'UA', season: '1', episode: String(idx + 1) });
            });
        }

        return sources;
    }

    function loadAnimeDetail(animeUrl, callback, onerror) {
        fetchPage(animeUrl, function (doc) {
            // title
            var title = '';
            var titleSels = ['.page__subcol-main h1', '.pmovie__title', 'h1.title', 'h1'];
            for (var i = 0; i < titleSels.length; i++) {
                var el = doc.querySelector(titleSels[i]);
                if (el && el.textContent.trim()) { title = el.textContent.trim(); break; }
            }

            // poster
            var poster = '';
            var posterSels = ['div.page__subcol-side .img-fit-cover img', '.pmovie__poster img', '.anime__poster img'];
            for (var j = 0; j < posterSels.length; j++) {
                var pe = doc.querySelector(posterSels[j]);
                if (pe) {
                    var src = pe.getAttribute('data-src') || pe.getAttribute('src') || '';
                    if (src) { poster = src.startsWith('http') ? src : ANIMEUA_BASE + src; break; }
                }
            }

            // synopsis
            var synopsis = '';
            var synSels = ['.full-text', '.pmovie__description', '.anime__description'];
            for (var k = 0; k < synSels.length; k++) {
                var se = doc.querySelector(synSels[k]);
                if (se && se.textContent.trim()) { synopsis = se.textContent.trim(); break; }
            }

            // iframes
            var iframes = doc.querySelectorAll('iframe[src], iframe[data-src]');
            var playerUrls = [];
            iframes.forEach(function (fr) {
                var s = fr.getAttribute('src') || fr.getAttribute('data-src');
                if (!s || s === 'about:blank') return;
                if (s.startsWith('//')) s = 'https:' + s;
                if (!s.startsWith('http')) s = ANIMEUA_BASE + s;
                playerUrls.push(s);
            });

            var allSources = [];
            var done = 0;

            if (!playerUrls.length) {
                callback({ title: title, poster: poster, synopsis: synopsis, sources: [], url: animeUrl });
                return;
            }

            playerUrls.forEach(function (pUrl) {
                var provider = pUrl.includes('ashdi') ? 'Ashdi' : pUrl.includes('vidmoly') ? 'Vidmoly' : 'UA';
                network.silent(proxyUrl(pUrl), function (html) {
                    allSources = allSources.concat(extractSources(html, provider));
                    done++;
                    if (done === playerUrls.length) {
                        callback({ title: title, poster: poster, synopsis: synopsis, sources: allSources, url: animeUrl });
                    }
                }, function () {
                    done++;
                    if (done === playerUrls.length) {
                        callback({ title: title, poster: poster, synopsis: synopsis, sources: allSources, url: animeUrl });
                    }
                });
            });
        }, onerror);
    }

    // ===== COMPONENT =====
    function buildCard(item) {
        return Lampa.Template.get('card', {
            title:       item.title,
            original:    '',
            poster:      item.poster,
            release_date:'',
            vote_average:''
        });
    }

    function MonoAnimeComponent(object) {
        var comp  = new Lampa.InteractionCategory(object);
        var items = [];

        comp.create = function () {
            getPage(object.page || 1, object.genre || '', object.search || '', function (list) {
                items = list.map(function (a) {
                    return {
                        id:       a.id,
                        title:    a.title,
                        original: '',
                        release_date: '',
                        poster:   a.poster,
                        vote_average: '',
                        url:      a.url,
                        source:   'monoanime'
                    };
                });
                comp.build(items);
            }, comp.empty.bind(comp));
        };

        comp.nextPageReuest = function (obj, resolve, reject) {
            getPage(obj.page || 1, obj.genre || '', obj.search || '', function (list) {
                resolve(list.map(function (a) {
                    return { id: a.id, title: a.title, original: '', release_date: '', poster: a.poster, vote_average: '', url: a.url, source: 'monoanime' };
                }));
            }, reject);
        };

        return comp;
    }

    // ===== CARD OPEN: detail modal =====
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite' && e.data && e.data.movie && e.data.movie.source === 'monoanime') {
            var movie = e.data.movie;
            loadAnimeDetail(movie.url, function (detail) {
                if (!detail.sources.length) {
                    Lampa.Noty.show('Епізоди не знайдено');
                    return;
                }

                // Grouped by dub
                var byDub = {};
                detail.sources.forEach(function (s) {
                    if (!byDub[s.dub]) byDub[s.dub] = [];
                    byDub[s.dub].push(s);
                });
                var dubs     = Object.keys(byDub);
                var firstDub = dubs[0];
                var eps      = byDub[firstDub];

                function playEpisode(ep) {
                    Lampa.Player.play({ title: detail.title + ' / ' + ep.label, url: proxyUrl(ep.file) });
                }

                var selectItems = dubs.map(function (dub) {
                    return { title: '🎙 ' + dub };
                });

                eps.forEach(function (ep) {
                    selectItems.push({ title: ep.label, episode: ep, dub: firstDub });
                });

                Lampa.Select.show({
                    title:    detail.title,
                    items:    selectItems,
                    onSelect: function (a) {
                        if (a.episode) {
                            playEpisode(a.episode);
                        } else {
                            // dub selected – show its episodes
                            var dubName = a.title.replace('🎙 ', '');
                            var dubEps  = byDub[dubName] || [];
                            Lampa.Select.show({
                                title:    detail.title + ' — ' + dubName,
                                items:    dubEps.map(function (ep) { return { title: ep.label, episode: ep }; }),
                                onSelect: function (b) { playEpisode(b.episode); },
                                onBack:   function () { Lampa.Controller.toggle('full_start'); }
                            });
                        }
                    },
                    onBack: function () { Lampa.Controller.toggle('full_start'); }
                });
            }, function (err) {
                Lampa.Noty.show('Помилка завантаження: ' + String(err));
            });
        }
    });

    // ===== PLUGIN INIT =====
    function startPlugin() {
        if (window.monoanime_ready) return;
        window.monoanime_ready = true;

        var manifest = {
            type:      'video',
            version:   '1.0.0',
            name:      'MonoAnime',
            description: 'Аніме з animeua.club',
            component: 'monoanime'
        };
        Lampa.Manifest.plugins = manifest;
        Lampa.Component.add('monoanime', MonoAnimeComponent);

        // --- MENU BUTTON ---
        function addMenuButton() {
            var icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
            var btn = $('<li class="menu__item selector"><div class="menu__ico">' + icon + '</div><div class="menu__text">' + manifest.name + '</div></li>');

            btn.on('hover:enter', function () {
                Lampa.Activity.push({
                    url:       '',
                    title:     'MonoAnime',
                    component: 'monoanime',
                    page:      1
                });
            });

            $('.menu .menu__list').eq(0).append(btn);
        }

        if (window.appready) {
            addMenuButton();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') addMenuButton();
            });
        }

        // --- SETTINGS ---
        Lampa.SettingsApi.addComponent({
            component: 'monoanime',
            icon:      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
            name:      'MonoAnime'
        });

        Lampa.SettingsApi.addParam({
            component: 'monoanime',
            param:     { type: 'title' },
            field:     { name: 'Каталог аніме' }
        });

        // Genre quick-launch buttons
        Object.entries(GENRE_MAP).forEach(function (entry) {
            var genreName = entry[0];
            var genreSlug = entry[1];
            Lampa.SettingsApi.addParam({
                component: 'monoanime',
                param:     { type: 'button', name: 'mono_genre_' + genreSlug },
                field:     { name: genreName },
                onChange: function () {
                    Lampa.Activity.push({
                        url:       '',
                        title:     genreName,
                        component: 'monoanime',
                        genre:     genreSlug,
                        page:      1
                    });
                }
            });
        });
    }

    if (!window.monoanime_ready) startPlugin();

})();
