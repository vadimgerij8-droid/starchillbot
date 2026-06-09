(function () {
    'use strict';

    var PROXY    = 'https://monoanime.animegran8.workers.dev';
    var BASE     = 'https://animeua.club';

    var GENRES = {
        "Усі аніме":        "",
        "Бойовики":         "boyovik",
        "Бойові мистецтва": "boivie",
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

    // ─── утиліти ───────────────────────────────────────────────
    function px(url) { return PROXY + '?url=' + encodeURIComponent(url); }

    function hashCode(str) {
        var h = 0;
        for (var i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
        return Math.abs(h);
    }

    function getHTML(url) {
        return fetch(px(url))
            .then(function (r) { return r.text(); })
            .then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
    }

    // ─── парсинг карток ────────────────────────────────────────
    function parseCards(doc) {
        var out = [];
        doc.querySelectorAll('.poster').forEach(function (card) {
            var a     = card.tagName === 'A' ? card : card.querySelector('a');
            var href  = a ? (a.getAttribute('href') || '') : '';
            var img   = card.querySelector('img');
            var src   = img ? (img.getAttribute('data-src') || img.getAttribute('src') || '') : '';
            var tEl   = card.querySelector('.poster__title') || card.querySelector('h3');
            var title = tEl ? tEl.textContent.trim() : 'Без назви';
            var url   = href.startsWith('http') ? href : BASE + href;
            if (src && !src.startsWith('http')) src = BASE + src;
            out.push({ id: hashCode(url), title: title, poster: src, url: url });
        });
        return out;
    }

    function buildPageUrl(page, genre, search) {
        if (search) return BASE + '/index.php?do=search&subaction=search&story=' + encodeURIComponent(search) + '&page=' + page;
        if (genre)  return page > 1 ? BASE + '/' + genre + '/page/' + page + '/' : BASE + '/' + genre + '/';
        return page > 1 ? BASE + '/page/' + page + '/' : BASE + '/';
    }

    // ─── парсинг відео-джерел з html плеєра ───────────────────
    function extractSources(html, provider) {
        var sources = [];

        // Спроба витягнути JSON playlist
        var m = html.match(/file\s*:\s*(\[[\s\S]+?\])/i)
             || html.match(/playlist\s*:\s*(\[[\s\S]+?\])/i);
        if (m) {
            try {
                var raw = m[1].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
                var arr = JSON.parse(raw);

                function walk(items, dub, season) {
                    season = season || '1';
                    (items || []).forEach(function (item) {
                        var sub = item.folder || item.playlist;
                        if (sub) {
                            var nd = dub || provider || 'UA';
                            var ns = season;
                            var t  = item.title || '';
                            var sm = t.match(/[Сс]езон\s*(\d+)/);
                            if (sm) { ns = sm[1]; } else if (t) { nd = t; }
                            walk(sub, nd, ns);
                        } else if (item.file) {
                            var ep  = item.title || 'Серія';
                            var nm  = ep.match(/(\d+)\s*[Сс]ері[яіяа]|[Сс]ері[яіяа]\s*(\d+)|Еп\.?\s*(\d+)/);
                            var num = nm ? (nm[1] || nm[2] || nm[3]) : '1';
                            sources.push({ label: ep, file: item.file, dub: (dub||provider||'UA').trim(), season: season, episode: num });
                        }
                    });
                }
                walk(arr, '', '1');
            } catch (e) {}
        }

        // Fallback — прямі m3u8 посилання
        if (!sources.length) {
            (html.match(/https?:\/\/[^\s'"<>]+\.m3u8[^\s'"<>]*/g) || []).forEach(function (u, i) {
                sources.push({ label: 'Серія ' + (i + 1), file: u, dub: provider || 'UA', season: '1', episode: String(i + 1) });
            });
        }
        return sources;
    }

    // ─── завантажити деталі аніме ──────────────────────────────
    function loadDetail(animeUrl) {
        return getHTML(animeUrl).then(function (doc) {
            // назва
            var title = '';
            ['.page__subcol-main h1', '.pmovie__title', 'h1'].some(function (s) {
                var el = doc.querySelector(s);
                if (el && el.textContent.trim()) { title = el.textContent.trim(); return true; }
            });

            // poster
            var poster = '';
            ['div.page__subcol-side .img-fit-cover img', '.pmovie__poster img', '.anime__poster img'].some(function (s) {
                var el = doc.querySelector(s);
                if (el) {
                    var src = el.getAttribute('data-src') || el.getAttribute('src') || '';
                    if (src) { poster = src.startsWith('http') ? src : BASE + src; return true; }
                }
            });

            // опис
            var synopsis = '';
            ['.full-text', '.pmovie__description', '.anime__description'].some(function (s) {
                var el = doc.querySelector(s);
                if (el && el.textContent.trim()) { synopsis = el.textContent.trim(); return true; }
            });

            // iframes плеєра
            var iframes = [];
            doc.querySelectorAll('iframe[src], iframe[data-src]').forEach(function (fr) {
                var s = fr.getAttribute('src') || fr.getAttribute('data-src');
                if (!s || s === 'about:blank') return;
                if (s.startsWith('//')) s = 'https:' + s;
                if (!s.startsWith('http')) s = BASE + s;
                iframes.push(s);
            });

            if (!iframes.length) return { title: title, poster: poster, synopsis: synopsis, sources: [] };

            // завантажуємо всі iframes паралельно
            return Promise.all(iframes.map(function (iUrl) {
                var prov = iUrl.includes('ashdi') ? 'Ashdi' : iUrl.includes('vidmoly') ? 'Vidmoly' : 'UA';
                return fetch(px(iUrl))
                    .then(function (r) { return r.text(); })
                    .then(function (html) { return extractSources(html, prov); })
                    .catch(function () { return []; });
            })).then(function (arrays) {
                var sources = [].concat.apply([], arrays);
                return { title: title, poster: poster, synopsis: synopsis, sources: sources };
            });
        });
    }

    // ─── показ вибору озвучки / серії ─────────────────────────
    function showEpisodeMenu(detail) {
        if (!detail.sources.length) {
            Lampa.Noty.show('Епізоди не знайдено');
            return;
        }

        // Групуємо: сезон → озвучка → епізоди
        var tree = {};
        detail.sources.forEach(function (s) {
            var sn = s.season || '1';
            var dn = s.dub   || 'UA';
            if (!tree[sn]) tree[sn] = {};
            if (!tree[sn][dn]) tree[sn][dn] = [];
            tree[sn][dn].push(s);
        });

        var seasons = Object.keys(tree).sort(function (a, b) { return +a - +b; });

        function playEp(ep) {
            Lampa.Player.play({
                title: detail.title + ' — ' + ep.label,
                url:   ep.file   // відео йде напряму або через проксі якщо треба CORS
            });
            Lampa.Player.playlist([{ title: detail.title + ' — ' + ep.label, url: ep.file }]);
        }

        function showEps(season, dub) {
            var eps = tree[season][dub];
            Lampa.Select.show({
                title:    detail.title + '  [' + dub + ']  Сезон ' + season,
                items:    eps.map(function (ep) { return { title: ep.label, ep: ep }; }),
                onSelect: function (a) { playEp(a.ep); },
                onBack:   function () { Lampa.Controller.toggle('full_start'); }
            });
        }

        function showDubs(season) {
            var dubs = Object.keys(tree[season]);
            if (dubs.length === 1) { showEps(season, dubs[0]); return; }
            Lampa.Select.show({
                title:    detail.title + ' — Озвучка',
                items:    dubs.map(function (d) { return { title: '🎙 ' + d, dub: d }; }),
                onSelect: function (a) { showEps(season, a.dub); },
                onBack:   function () { Lampa.Controller.toggle('full_start'); }
            });
        }

        if (seasons.length === 1) {
            showDubs(seasons[0]);
        } else {
            Lampa.Select.show({
                title:    detail.title + ' — Сезон',
                items:    seasons.map(function (s) { return { title: 'Сезон ' + s, season: s }; }),
                onSelect: function (a) { showDubs(a.season); },
                onBack:   function () { Lampa.Controller.toggle('full_start'); }
            });
        }
    }

    // ─── обробник відкриття картки ─────────────────────────────
    Lampa.Listener.follow('full', function (e) {
        if (e.type !== 'complite') return;
        var movie = e.data && e.data.movie;
        if (!movie || movie.source !== 'monoanime') return;

        // Показуємо кнопку "Дивитись" в інтерфейсі full-start
        var $btns = $('.full-start-new__buttons, .full-start__buttons');
        if ($btns.length && !$btns.find('.btn--monoanime').length) {
            var $btn = $('<div class="full-start__button selector btn--monoanime"><span>▶ Дивитись</span></div>');
            $btns.prepend($btn);
            $btn.on('hover:enter click', function () {
                Lampa.Noty.show('Завантаження...');
                loadDetail(movie.url).then(function (detail) {
                    showEpisodeMenu(detail);
                }).catch(function (err) {
                    Lampa.Noty.show('Помилка: ' + String(err));
                });
            });
        }
    });

    // ─── компонент (список карток) ─────────────────────────────
    function MonoAnimeComponent(object) {
        var comp = new Lampa.InteractionCategory(object);

        function toCard(a) {
            return {
                id:           a.id,
                title:        a.title,
                original:     a.title,
                release_date: '',
                poster:       a.poster,
                img:          a.poster,
                background_image: a.poster,
                vote_average: '',
                source:       'monoanime',
                url:          a.url
            };
        }

        comp.create = function () {
            var url = buildPageUrl(object.page || 1, object.genre || '', object.search || '');
            getHTML(url).then(function (doc) {
                var items = parseCards(doc).map(toCard);
                if (items.length) comp.build({ results: items, page: object.page || 1 });
                else comp.empty();
            }).catch(function () { comp.empty(); });
        };

        comp.nextPageReuest = function (obj, resolve, reject) {
            var url = buildPageUrl(obj.page || 1, obj.genre || '', obj.search || '');
            getHTML(url).then(function (doc) {
                resolve({ results: parseCards(doc).map(toCard), page: obj.page || 1 });
            }).catch(reject);
        };

        return comp;
    }

    // ─── старт плагіна ─────────────────────────────────────────
    function startPlugin() {
        if (window.monoanime_ready) return;
        window.monoanime_ready = true;

        var manifest = {
            type: 'video', version: '1.1.0',
            name: 'MonoAnime', description: 'Аніме з animeua.club',
            component: 'monoanime'
        };
        Lampa.Manifest.plugins = manifest;
        Lampa.Component.add('monoanime', MonoAnimeComponent);

        function addMenu() {
            var $btn = $('<li class="menu__item selector">'
                + '<div class="menu__ico"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>'
                + '<div class="menu__text">MonoAnime</div></li>');
            $btn.on('hover:enter', function () {
                Lampa.Activity.push({ url: '', title: 'MonoAnime', component: 'monoanime', page: 1 });
            });
            $('.menu .menu__list').eq(0).append($btn);
        }

        if (window.appready) addMenu();
        else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') addMenu(); });

        // Налаштування — жанри
        Lampa.SettingsApi.addComponent({
            component: 'monoanime',
            icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
            name: 'MonoAnime'
        });
        Lampa.SettingsApi.addParam({ component: 'monoanime', param: { type: 'title' }, field: { name: 'Жанри' } });

        Object.keys(GENRES).forEach(function (name) {
            var slug = GENRES[name];
            Lampa.SettingsApi.addParam({
                component: 'monoanime',
                param: { type: 'button', name: 'mono_' + (slug || 'all') },
                field: { name: name },
                onChange: function () {
                    Lampa.Activity.push({ url: '', title: name, component: 'monoanime', genre: slug, page: 1 });
                }
            });
        });
    }

    if (!window.monoanime_ready) startPlugin();
})();
