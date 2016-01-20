define(['connectionManager', 'usersettings', 'events'], function (connectionManager, userSettings, events) {

    var allTranslations = {};
    var currentCulture;

    function getCurrentLocale() {

        return currentCulture;
    }

    function getDefaultLanguage() {

        if (navigator.language) {
            return navigator.language;
        }
        if (navigator.userLanguage) {
            return navigator.userLanguage;
        }
        if (navigator.languages && navigator.languages.length) {
            return navigator.languages[0];
        }
        alert('nulll');
        return 'en-us'
    }

    function updateCurrentCulture() {

        var culture;
        try {
            culture = userSettings.get('language');
        } catch (err) {

        }
        culture = culture || getDefaultLanguage();

        currentCulture = normalizeLocaleName(culture);

        ensureTranslations(currentCulture);
    }

    function ensureTranslations(culture) {

        for (var i in allTranslations) {
            ensureTranslation(allTranslations[i], culture);
        }
    }

    function ensureTranslation(translationInfo, culture) {

        if (translationInfo.dictionaries[culture]) {
            return Promise.resolve();
        }

        return loadTranslation(translationInfo.translations, culture).then(function (dictionary) {

            translationInfo.dictionaries[culture] = dictionary;
        });
    }

    function normalizeLocaleName(culture) {

        culture = culture.replace('_', '-');

        // If it's de-DE, convert to just de
        var parts = culture.split('-');
        if (parts.length == 2) {
            if (parts[0].toLowerCase() == parts[1].toLowerCase()) {
                culture = parts[0].toLowerCase();
            }
        }

        return culture.toLowerCase();
    }

    function getDictionary(module) {

        if (module == 'theme') {
            module = Emby.ThemeManager.getCurrentTheme().packageName;
        }

        var translations = allTranslations[module];

        if (!translations) {
            return {};
        }

        return translations.dictionaries[getCurrentLocale()];
    }

    function loadTranslations(options) {

        allTranslations[options.name] = {
            translations: options.translations,
            dictionaries: {}
        };

        var locale = getCurrentLocale();

        return ensureTranslation(allTranslations[options.name], locale);
    }

    var cacheParam = new Date().getTime();
    function loadTranslation(translations, lang) {

        lang = normalizeLocaleName(lang);

        var filtered = translations.filter(function (t) {
            return normalizeLocaleName(t.lang) == lang;
        });

        if (!filtered.length) {
            filtered = translations.filter(function (t) {
                return normalizeLocaleName(t.lang) == 'en-us';
            });
        }

        return new Promise(function (resolve, reject) {

            if (!filtered.length) {
                resolve();
                return;
            }

            var url = filtered[0].path;

            url += url.indexOf('?') == -1 ? '?' : '&';
            url += 'v=' + cacheParam;

            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);

            xhr.onload = function (e) {
                if (this.status < 400) {
                    resolve(JSON.parse(this.response));
                }
                resolve({});
            };

            xhr.onerror = function () {
                resolve({});
            };
            xhr.send();
        });
    }

    function extend(target) {
        var slice = Array.prototype.slice;
        slice.call(arguments, 1).forEach(function (source) {
            for (key in source)
                if (source[key] !== undefined)
                    target[key] = source[key]
        })
        return target
    }

    function translateKey(key) {

        var parts = key.split('#');
        var module;

        if (parts.length == 1) {
            module = 'theme';
        } else {
            module = parts[0];
            key = parts[1];
        }

        return translateKeyFromModule(key, module);
    }

    function translateKeyFromModule(key, module) {

        return getDictionary(module)[key] || key;
    }

    function translate(key) {

        var val = translateKey(key);

        for (var i = 1; i < arguments.length; i++) {

            val = val.replace('{' + (i - 1) + '}', arguments[i]);

        }

        return val;
    }

    function translateHtml(html, module) {

        if (!module) {
            throw new Error('module cannot be null or empty');
        }

        var startIndex = html.indexOf('${');

        if (startIndex == -1) {
            return html;
        }

        startIndex += 2;
        var endIndex = html.indexOf('}', startIndex);

        if (endIndex == -1) {
            return html;
        }

        var key = html.substring(startIndex, endIndex);
        var val = translateKeyFromModule(key, module);

        html = html.replace('${' + key + '}', val);
        return translateHtml(html, module);
    }

    updateCurrentCulture();

    events.on(connectionManager, 'localusersignedin', updateCurrentCulture);
    events.on(userSettings, 'change', function (e, name) {
        if (name == 'language') {
            updateCurrentCulture();
        }
    });

    return {
        translate: translate,
        translateHtml: translateHtml,
        loadTranslations: loadTranslations
    };

});