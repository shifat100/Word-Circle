document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // Polyfills for older environments (like Firefox OS 2.2 / Gecko 37)

    // 1. NodeList.prototype.forEach
    if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = function (callback, thisArg) {
            thisArg = thisArg || window;
            for (var i = 0; i < this.length; i++) {
                callback.call(thisArg, this[i], i, this);
            }
        };
    }

    // 2. Array.prototype.includes
    if (!Array.prototype.includes) {
        Object.defineProperty(Array.prototype, 'includes', {
            value: function(searchElement, fromIndex) {
                if (this == null) {
                    throw new TypeError('"this" is null or not defined');
                }
                var o = Object(this);
                var len = o.length >>> 0;
                if (len === 0) {
                    return false;
                }
                var n = fromIndex | 0;
                var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
                function sameValueZero(x, y) {
                    return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
                }
                while (k < len) {
                    if (sameValueZero(o[k], searchElement)) {
                        return true;
                    }
                    k++;
                }
                return false;
            }
        });
    }

    // 3. Array.prototype.find
    if (!Array.prototype.find) {
        Object.defineProperty(Array.prototype, 'find', {
            value: function(predicate) {
                if (this == null) {
                    throw new TypeError('"this" is null or not defined');
                }
                var o = Object(this);
                var len = o.length >>> 0;
                if (typeof predicate !== 'function') {
                    throw new TypeError('predicate must be a function');
                }
                var thisArg = arguments[1];
                var k = 0;
                while (k < len) {
                    var kValue = o[k];
                    if (predicate.call(thisArg, kValue, k, o)) {
                        return kValue;
                    }
                    k++;
                }
                return undefined;
            }
        });
    }

    // 4. Array.prototype.findIndex
    if (!Array.prototype.findIndex) {
        Object.defineProperty(Array.prototype, 'findIndex', {
            value: function(predicate) {
                if (this == null) {
                    throw new TypeError('"this" is null or not defined');
                }
                var o = Object(this);
                var len = o.length >>> 0;
                if (typeof predicate !== 'function') {
                    throw new TypeError('predicate must be a function');
                }
                var thisArg = arguments[1];
                var k = 0;
                while (k < len) {
                    var kValue = o[k];
                    if (predicate.call(thisArg, kValue, k, o)) {
                        return k;
                    }
                    k++;
                }
                return -1;
            }
        });
    }

    // 5. Element.prototype.matches (helper for .closest)
    if (!Element.prototype.matches) {
        Element.prototype.matches =
            Element.prototype.matchesSelector ||
            Element.prototype.mozMatchesSelector ||
            Element.prototype.msMatchesSelector ||
            Element.prototype.oMatchesSelector ||
            Element.prototype.webkitMatchesSelector ||
            function(s) {
                var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                    i = matches.length;
                while (--i >= 0 && matches.item(i) !== this) {}
                return i > -1;
            };
    }

    // 6. Element.prototype.closest
    if (!Element.prototype.closest) {
        Element.prototype.closest = function(s) {
            var el = this;
            if (!document.documentElement.contains(el)) return null;
            do {
                if (el.matches(s)) return el;
                el = el.parentElement || el.parentNode; // el.parentNode for SVG
            } while (el !== null && el.nodeType === 1);
            return null;
        };
    }

    // Original code starts here
    var APP_VERSION = "1.0.1";

    // Define NetworkHelper early, as it will be used by loadLocale
    var NetworkHelper = {
        fetchJSON: function(url, successCallback, errorCallback) {
            var xhr = new XMLHttpRequest({ mozSystem: true }); // Use { mozSystem: true }
            xhr.open('GET', url, true);
            xhr.setRequestHeader('Accept', 'application/json');
            // xhr.responseType = 'json'; // Avoid for broader KaiOS compatibility; parse manually

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            var jsonData = JSON.parse(xhr.responseText);
                            getKaiAd({
                                publisher: '080b82ab-b33a-4763-a498-50f464567e49',
                                app: 'word_puzzle',
                                slot: 'word_puzzle',
                                onerror: err => console.error('Custom catch:', err),
                                onready: ad => {
                                    ad.call('display');
                                }
                            });
                            if (successCallback) successCallback(jsonData);
                        } catch (e) {
                            var parseError = new Error('JSON parsing error for ' + url + ': ' + e.message);
                            parseError.status = xhr.status; // Optionally add status
                            parseError.originalError = e; // Keep track of the original error
                            console.error(parseError.message, e);
                            if (errorCallback) errorCallback(parseError);
                        }
                    } else {
                        // Handle HTTP errors (non-200 status)
                        var httpError = new Error('Network response was not ok for URL: ' + url + ' - Status: ' + xhr.status + (xhr.statusText ? ' ' + xhr.statusText : ''));
                        httpError.status = xhr.status;
                        console.error(httpError.message);
                        if (errorCallback) errorCallback(httpError);
                    }
                }
            };

            xhr.onerror = function() {
                // Handle network-level errors (e.g., connection refused, DNS failure)
                var networkError = new Error('Network request failed for URL: ' + url);
                networkError.status = 0; // Convention for non-HTTP errors
                console.error(networkError.message);
                if (errorCallback) errorCallback(networkError);
            };

            xhr.send();
        }


    };

    var currentSystemLang = 'en';
    var defaultSystemLang = 'en';
    var supportedSystemLangs = ['en','bn','hi','ur','ar'];
    var translations = {};

    function loadLocale(langCode, callback) {
        var url = 'locales/' + langCode + '.json';
        NetworkHelper.fetchJSON(url,
            function(data) { // Success callback
                translations[langCode] = data;
                if (callback) callback(null, langCode);
            },
            function(error) { // Error callback (receives a single Error object from NetworkHelper)
                // The error object from NetworkHelper already contains a descriptive message.
                // We log it again here with the specific 'Failed to load locale' context.
                console.error('Failed to load locale ' + langCode + ':', error);
                if (callback) callback(error, langCode); // Pass the error object from NetworkHelper
            }
        );
    }

    function _t(key, params) {
        var primaryLangStore = translations[currentSystemLang] || {};
        var defaultLangStore = translations[defaultSystemLang] || {};
        var translation;

        if (primaryLangStore.hasOwnProperty(key)) {
            translation = primaryLangStore[key];
        } else if (defaultLangStore.hasOwnProperty(key)) {
            translation = defaultLangStore[key];
        } else {
            translation = '[' + key + ']';
        }

        if (params && typeof params === 'object') {
            translation = translation.replace(/\{(\w+)\}/g, function(match, placeholderKey) {
                return params.hasOwnProperty(placeholderKey) ? params[placeholderKey] : match;
            });
        }
        return translation;
    }

    function applyAllUITranslations() {
        document.querySelectorAll('[data-i18n-key]').forEach(function(element) {
            var key = element.dataset.i18nKey;
            var i18nParams = element.dataset.i18nParams;
            var params = null;
            if (i18nParams) {
                try { params = JSON.parse(i18nParams); } catch (e) { console.error("Error parsing i18n-params for key:", key, e); }
            }
            var translation = _t(key, params);

            if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'number') && element.hasAttribute('placeholder')) {
                element.placeholder = translation;
            } else if (element.dataset.i18nTarget === 'html') {
                element.innerHTML = translation;
            } else {
                element.textContent = translation;
            }
        });
        document.title = _t('app_title');
        if (focusableElements && focusableElements[currentFocusIndex]) {
            updateSoftkeysForElement(focusableElements[currentFocusIndex]);
        } else {
            updateSoftkeys();
        }
        if (loadingOverlay.style.display === 'flex' && loadingOverlayMessage.dataset.i18nKey) {
             loadingOverlayMessage.textContent = _t(loadingOverlayMessage.dataset.i18nKey, JSON.parse(loadingOverlayMessage.dataset.i18nParams || '{}'));
        }
    }

    function setSystemLanguage(langCode) {
        if (!supportedSystemLangs.includes(langCode)) {
            console.warn('Unsupported system language for UI: ' + langCode + '. Staying with ' + currentSystemLang);
            return;
        }
        var oldLang = currentSystemLang;
        currentSystemLang = langCode;

        function applyAndSave() {
            localStorage.setItem('appSystemLanguage', currentSystemLang);
            document.documentElement.lang = currentSystemLang;
            applyAllUITranslations();


            if (currentScreen && document.getElementById(currentScreen + "-screen")) {
                updateFocusableElements();
                var currentFocusedEl = document.querySelector('.kaios-focus');
                var newFocusIdx = -1;

                if (currentFocusedEl && focusableElements.includes(currentFocusedEl)) {
                    newFocusIdx = focusableElements.indexOf(currentFocusedEl);
                } else if (focusableElements.length > 0) {
                     var screenElement = document.getElementById(currentScreen + '-screen');
                     var defaultFocusId = screenElement ? screenElement.dataset.defaultFocus : null;
                     var defaultFocusEl = defaultFocusId ? document.getElementById(defaultFocusId) : null;
                     newFocusIdx = defaultFocusEl ? focusableElements.indexOf(defaultFocusEl) : 0;
                     if (newFocusIdx === -1 && focusableElements.length > 0) newFocusIdx = 0;
                }
                setFocus(newFocusIdx !== -1 ? newFocusIdx : 0);
            } else {
                updateSoftkeys();
            }
        }

        if (translations[currentSystemLang]) {
            applyAndSave();
        } else {
            showLoadingOverlay('loading');
            loadLocale(currentSystemLang, function(err) {
                hideLoadingOverlay();
                if (err) {
                    alert(_t('error_loading_locale_param', { langCode: currentSystemLang }) + '\n' + _t('reverting_to_lang_param', { langCode: oldLang }));
                    currentSystemLang = oldLang;

                    if (!translations[currentSystemLang]) {
                        console.warn("Reverted language " + currentSystemLang + " also not loaded. Attempting default.");
                        setSystemLanguage(defaultSystemLang);
                    } else {
                        document.documentElement.lang = currentSystemLang;
                        applyAllUITranslations();
                    }
                    return;
                }

                if (currentSystemLang !== defaultSystemLang && !translations[defaultSystemLang]) {
                    loadLocale(defaultSystemLang, function(errDef) {
                        if (errDef) console.warn('Could not load default language ' + defaultSystemLang + ' as fallback during language switch.');
                        applyAndSave();
                    });
                } else {
                    applyAndSave();
                }
            });
        }
    }




    var initialLoadingScreen = document.getElementById('initial-loading-screen');
    var noLanguagesPromptScreen = document.getElementById('no-languages-prompt-screen');
    var languageSelectionScreen = document.getElementById('language-selection-screen');
    var gameModeScreen = document.getElementById('game-mode-screen');
    var settingsInfoScreen = document.getElementById('settings-info-screen');
    var appLanguageSettingsScreen = document.getElementById('app-language-settings-screen');
    var customSetupScreen = document.getElementById('custom-setup-screen');
    var instructionsScreen = document.getElementById('instructions-screen');
    var instructionsContentBox = document.getElementById('instructions-content-box');
    var aboutScreen = document.getElementById('about-screen');
    var languageManagementScreen = document.getElementById('language-management-screen');
    var gameScreen = document.getElementById('game-screen');
    var gameOverScreen = document.getElementById('game-over-screen');
    var loadingOverlay = document.getElementById('loading-overlay');


    var appLanguageSettingsButton = document.getElementById('app-language-settings-button');
    var appLanguageListContainer = document.getElementById('app-language-list-container');
    var backFromAppLangSettingsButton = document.getElementById('back-from-app-lang-settings-button');


    var goToLanguageManagementButton = document.getElementById('go-to-language-management-button');
    var exitAppPromptButton = document.getElementById('exit-app-prompt-button');
    var downloadedLanguagesListContainer = document.getElementById('downloaded-languages-list-container');
    var noDownloadedLanguagesMessage = document.getElementById('no-downloaded-languages-message');
    var manageLanguagesFromSelectButton = document.getElementById('manage-languages-from-select-button');

    var selectedLangForModeDisplay = document.getElementById('selected-lang-for-mode');
    var startRandomGameModeButton = document.getElementById('start-random-game-mode-button');
    var startCustomGameModeButton = document.getElementById('start-custom-game-mode-button');
    var backToLangSelectButton = document.getElementById('back-to-lang-select-button');
    var goToMainSettingsButton = document.getElementById('go-to-main-settings-button');

    var instructionsButtonSettings = document.getElementById('instructions-button-settings');
    var aboutButtonSettings = document.getElementById('about-button-settings');
    var manageLanguagesSettingsButton = document.getElementById('manage-languages-settings-button');
    var backToGameModeFromSettingsButton = document.getElementById('back-to-game-mode-from-settings-button');

    var customGameQuestionsLabel = document.getElementById('custom-game-questions-label');
    var customNumberInput = document.getElementById('custom-number-input');
    var startCustomGameButton = document.getElementById('start-custom-game-button');
    var backToGameModeButton = document.getElementById('back-to-game-mode-button');

    var availableLanguagesListContainer = document.getElementById('available-languages-list-container');
    var languageListMessage = document.getElementById('language-list-message');
    var checkForUpdatesButton = document.getElementById('check-for-updates-button');
    var backFromLangManageButton = document.getElementById('back-from-lang-manage-button');

    var backToSettingsFromInstructionsButton = document.getElementById('back-to-settings-from-instructions-button');
    var backToSettingsFromAboutButton = document.getElementById('back-to-settings-from-about-button');

    var puzzleContainer = document.getElementById('puzzle-container');
    var answerInput = document.getElementById('answer-input');
    var resultDisplay = document.getElementById('result');
    var gameButtonsContainer = document.querySelector('.game-buttons-container');
    var submitButton = document.getElementById('submit-button');
    var revealAnswerButton = document.getElementById('reveal-answer-button');
    var nextQuestionButton = document.getElementById('next-question-button');
    var quitGameButton = document.getElementById('quit-game-button');

    var scoreDisplay = document.getElementById('score');
    var gameScreenLanguageNameDisplay = document.getElementById('game-screen-language-name');
    var currentPuzzleCountDisplay = document.getElementById('current-puzzle-count');
    var totalPuzzlesDisplay = document.getElementById('total-puzzles');

    var finalScoreMessage = document.getElementById('final-score-message');
    var playAgainModeSelectButton = document.getElementById('play-again-mode-select-button');
    var changeLanguageGameOverButton = document.getElementById('change-language-game-over-button');
    var mainMenuGameOverButton = document.getElementById('main-menu-game-over-button');

    var loadingOverlayMessage = document.getElementById('loading-overlay-message');

    var softkeyLeft = document.getElementById('softkey-left');
    var softkeyCenter = document.getElementById('softkey-center');
    var softkeyRight = document.getElementById('softkey-right');

    var currentPuzzlesList = [];
    var currentPuzzleIndex = 0;
    var score = 0;
    var totalPuzzlesInGame = 0;
    var selectedLanguage = null;
    var serverManifest = null;
    var localLanguagesMetadata = [];
    var previousScreen = null;

    var SERVER_BASE_URL = './';
    var MANIFEST_FILE_PATH = 'data/manifest.json';

    var focusableElements = [];
    var currentFocusIndex = -1;
    var currentScreen = 'initial-loading';
    var allScreens = [
        initialLoadingScreen, noLanguagesPromptScreen, languageSelectionScreen, gameModeScreen,
        settingsInfoScreen, appLanguageSettingsScreen,
        customSetupScreen, instructionsScreen, aboutScreen,
        languageManagementScreen, gameScreen, gameOverScreen
    ];


    // IDBHelper and other functions (shuffleArray, shuffleWord, etc.) remain unchanged.
    // ... (rest of the original JavaScript code from shuffleArray onwards)

    function shuffleArray(array) {
        var newArray = array.slice();
        for (var i = newArray.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = newArray[i];
            newArray[i] = newArray[j];
            newArray[j] = temp;
        }
        return newArray;
    }
    function shuffleWord(wordWithSpaces) {
        var parts = wordWithSpaces.split(' ').filter(function(p) { return p.trim() !== ''; });
        if (parts.length <= 1) return parts.join(' ');
        for (var i = parts.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = parts[i];
            parts[i] = parts[j];
            parts[j] = temp;
        }
        return parts.join(' ');
    }
    function getBanglaGlyphsForDisplay(wordWithSpaces) {
        if (!wordWithSpaces || wordWithSpaces.trim() === "") return [];
        return wordWithSpaces.split(' ').filter(function(p) { return p.trim() !== ''; });
    }
    function preparePuzzles(puzzlesToPrepare) {
        if (!puzzlesToPrepare || !Array.isArray(puzzlesToPrepare)) { return []; }
        return puzzlesToPrepare.map(function (puzzle) {
            var newPuzzle = { original: (puzzle.original || "").trim(), shuffled: (puzzle.shuffled || "").trim() };
            if (!newPuzzle.original) { return null; }
            if (!newPuzzle.shuffled) {
                var originalGlyphParts = newPuzzle.original.split(' ').filter(function(p) { return p.trim() !== ''; });
                if (originalGlyphParts.length <= 1) { newPuzzle.shuffled = newPuzzle.original; }
                else {
                    var tempShuffled; var attempts = 0;
                    do { tempShuffled = shuffleWord(newPuzzle.original); attempts++; }
                    while (tempShuffled === newPuzzle.original && attempts < 20 && originalGlyphParts.length > 1);
                    newPuzzle.shuffled = tempShuffled;
                }
            }
            if (!newPuzzle.shuffled || newPuzzle.shuffled.trim() === "") { newPuzzle.shuffled = newPuzzle.original; }
            return newPuzzle;
        }).filter(function(p){ return p !== null; });
    }


    function showLoadingOverlay(messageKey, params) {
        loadingOverlayMessage.dataset.i18nKey = messageKey || 'loading_ellipsis';
        loadingOverlayMessage.dataset.i18nParams = JSON.stringify(params || {});
        loadingOverlayMessage.textContent = _t(messageKey || 'loading_ellipsis', params);
        loadingOverlay.style.display = 'flex';
    }
    function hideLoadingOverlay() {
        loadingOverlay.style.display = 'none';
        loadingOverlayMessage.removeAttribute('data-i18n-key');
        loadingOverlayMessage.removeAttribute('data-i18n-params');
    }
    function showScreen(screenId, keepFocus) {
        if (currentScreen !== 'initial-loading' && currentScreen !== screenId.replace('-screen', '')) {
            previousScreen = currentScreen;
        }
        allScreens.forEach(function (screenElement) {
            if (screenElement) screenElement.style.display = 'none';
        });
        var targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.style.display = 'flex';
            currentScreen = screenId.replace('-screen', '');
        } else {
            console.error("Screen not found: " + screenId + ". Defaulting.");
            currentScreen = 'language-selection';
            if (languageSelectionScreen) languageSelectionScreen.style.display = 'flex'; else if (initialLoadingScreen) initialLoadingScreen.style.display = 'flex';
        }
        var oldFocusIndex = currentFocusIndex;
        updateFocusableElements();
        if (keepFocus && oldFocusIndex !== -1 && oldFocusIndex < focusableElements.length) {
            setFocus(oldFocusIndex);
        } else if (focusableElements.length > 0) {
            var defaultFocusId = targetScreen ? targetScreen.dataset.defaultFocus : null;
            var defaultFocusEl = defaultFocusId ? document.getElementById(defaultFocusId) : null;
            var focusIdx = defaultFocusEl ? focusableElements.indexOf(defaultFocusEl) : 0;
            if (focusIdx === -1 && focusableElements.length > 0) focusIdx = 0;
            setFocus(focusIdx);
        } else {
            currentFocusIndex = -1;
            updateSoftkeys();
        }
    }
    function updateFocusableElements() {
        focusableElements = [];
        var screenElement = document.getElementById(currentScreen + '-screen');
        if (!screenElement || screenElement.style.display === 'none') {
            currentFocusIndex = -1; updateSoftkeys(); return;
        }

        var elements = screenElement.querySelectorAll('button:not([disabled]), input[type="text"]:not([disabled]), input[type="number"]:not([disabled]), [data-focusable="true"]:not([disabled])');
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            if (el.offsetParent !== null && focusableElements.indexOf(el) === -1) { // Check indexOf for Array.prototype.includes polyfill
                focusableElements.push(el);
            }
        }

        function addDynamicListItems(container) {
            if (container && screenElement.contains(container)) {
                var listButtons = container.querySelectorAll('button:not([disabled])');
                for(var k=0; k < listButtons.length; k++) {
                    if (listButtons[k].offsetParent !== null && focusableElements.indexOf(listButtons[k]) === -1) { // Check indexOf
                        focusableElements.push(listButtons[k]);
                    }
                }
            }
        }
        if (currentScreen === 'language-management') addDynamicListItems(availableLanguagesListContainer);
        if (currentScreen === 'language-selection') addDynamicListItems(downloadedLanguagesListContainer);
        if (currentScreen === 'app-language-settings') addDynamicListItems(appLanguageListContainer);


        if (currentScreen === 'game' && gameButtonsContainer && gameButtonsContainer.style.display !== 'none') {
            var gameActionButtons = gameButtonsContainer.querySelectorAll('button:not([disabled])');
             for (var j = 0; j < gameActionButtons.length; j++) {
                if (gameActionButtons[j].offsetParent !== null && focusableElements.indexOf(gameActionButtons[j]) === -1) { // Check indexOf
                    focusableElements.push(gameActionButtons[j]);
                }
            }
        }


        if (currentScreen === 'game' && answerInput && !answerInput.disabled && answerInput.offsetParent !== null && focusableElements.indexOf(answerInput) === -1) { // Check indexOf
            focusableElements.unshift(answerInput);
        }
    }

    function setFocus(index) {
        if (currentFocusIndex >= 0 && currentFocusIndex < focusableElements.length) {
            if (focusableElements[currentFocusIndex]) {
                focusableElements[currentFocusIndex].classList.remove('kaios-focus');
            }
        }
        if (focusableElements.length === 0) {
            currentFocusIndex = -1; updateSoftkeys(); return;
        }
        currentFocusIndex = (index + focusableElements.length) % focusableElements.length;
        var newFocusedElement = focusableElements[currentFocusIndex];
        if (newFocusedElement) {
            newFocusedElement.classList.add('kaios-focus');
            if (typeof newFocusedElement.focus === 'function') {
                setTimeout(function() { newFocusedElement.focus(); }, 50);
            }

            if (typeof newFocusedElement.scrollIntoView === 'function') {
                var parentList = newFocusedElement.closest('.scrollable-list, .content-box'); // Uses .closest()
                if (parentList) {
                     var elementRect = newFocusedElement.getBoundingClientRect();
                     var parentRect = parentList.getBoundingClientRect();
                     if (elementRect.bottom > parentRect.bottom) {
                         parentList.scrollTop += (elementRect.bottom - parentRect.bottom) + 5;
                     } else if (elementRect.top < parentRect.top) {
                         parentList.scrollTop -= (parentRect.top - elementRect.top) + 5;
                     }
                } else {
                }
            }
            updateSoftkeysForElement(newFocusedElement);
        } else {
            currentFocusIndex = -1;
            updateSoftkeys();
        }
    }
    function updateSoftkeysForElement(element) {
        softkeyLeft.textContent = (element && element.dataset.softleftKey) ? _t(element.dataset.softleftKey) : getDefaultSoftkeyLeft();
        var centerTextKey = "softkey_select";
        if (element) {
            if (element.dataset.softcenterKey) {
                centerTextKey = element.dataset.softcenterKey;
            } else if (element.tagName === 'INPUT' || element.classList.contains('has-text-input')) {
                centerTextKey = "softkey_edit";
            } else if (element.classList.contains('content-box') && element.scrollHeight > element.clientHeight) {
                centerTextKey = "softkey_scroll";
            }
        }
        softkeyCenter.textContent = _t(centerTextKey);
        softkeyRight.textContent = (element && element.dataset.softrightKey) ? _t(element.dataset.softrightKey) : getDefaultSoftkeyRight();
    }
    function getDefaultSoftkeyLeft() {
        switch (currentScreen) {
            case 'game': return (revealAnswerButton && revealAnswerButton.style.display !== 'none' && !revealAnswerButton.disabled) ? _t("softkey_reveal_hash") : (quitGameButton && quitGameButton.style.display !== 'none' ? _t("softkey_menu") : "");
            case 'custom-setup': return _t("softkey_back");
            case 'instructions': case 'about': return _t("softkey_back");
            case 'language-selection': return _t(manageLanguagesFromSelectButton.dataset.softleftKey || "softkey_options");
            case 'game-mode': return _t("softkey_back");
            case 'language-management': return _t("softkey_back");
            case 'settings-info': return _t("softkey_back");
            case 'app-language-settings': return _t("softkey_back");
            default: return "";
        }
    }
    function getDefaultSoftkeyRight() {
        var focusedElement = (currentFocusIndex !== -1 && focusableElements[currentFocusIndex]) ? focusableElements[currentFocusIndex] : null;
        if (focusedElement && focusedElement.dataset.softrightKey) { return _t(focusedElement.dataset.softrightKey); }

        switch (currentScreen) {
            case 'game':
                if (nextQuestionButton && nextQuestionButton.style.display !== 'none' && !nextQuestionButton.disabled) return _t("softkey_next");
                if (submitButton && submitButton.style.display !== 'none' && !submitButton.disabled) return _t("softkey_submit");
                return (quitGameButton && quitGameButton.style.display !== 'none' ? _t("softkey_menu") : "");
            case 'custom-setup': return _t("softkey_start");
            case 'game-over': return _t((playAgainModeSelectButton.dataset.softrightKey || "softkey_play"));
            case 'no-languages-prompt': return _t((goToLanguageManagementButton.dataset.softrightKey || "softkey_download"));
            default: return _t("softkey_select");
        }
    }
    function updateSoftkeys() {
        var focusedElement = (currentFocusIndex !== -1 && currentFocusIndex < focusableElements.length) ? focusableElements[currentFocusIndex] : null;
        if (focusedElement) {
            updateSoftkeysForElement(focusedElement);
        } else {
            softkeyLeft.textContent = getDefaultSoftkeyLeft();
            softkeyRight.textContent = getDefaultSoftkeyRight();
            var defaultCenterKey = "";
            if (focusableElements.length > 0) {
                defaultCenterKey = "softkey_select";
            }

            if (currentScreen === 'game' && answerInput && !answerInput.disabled) defaultCenterKey = "softkey_edit";
            else if (currentScreen === 'custom-setup' && customNumberInput && !customNumberInput.disabled) defaultCenterKey = "softkey_edit";
            else if ((currentScreen === 'instructions' && instructionsContentBox && instructionsContentBox.scrollHeight > instructionsContentBox.clientHeight && focusableElements.length ===1 && focusableElements[0] === instructionsContentBox) ||
                     (currentScreen === 'about' && document.querySelector('#about-screen .content-box') && document.querySelector('#about-screen .content-box').scrollHeight > document.querySelector('#about-screen .content-box').clientHeight && focusableElements.length ===1 && focusableElements[0] === document.querySelector('#about-screen .content-box'))) {
                defaultCenterKey = "softkey_scroll";
            }
            softkeyCenter.textContent = defaultCenterKey ? _t(defaultCenterKey) : "";
        }
    }


    function populateAppLanguageSettingsScreen() {
        if (!appLanguageListContainer) {
            console.error("App language list container not found for populating.");
            return;
        }
        appLanguageListContainer.innerHTML = '';
        supportedSystemLangs.forEach(function(langCode) {
            var button = document.createElement('button');
            var langNameKey = 'language_name_' + langCode;
            var displayName = _t(langNameKey);

            if (displayName === '[' + langNameKey + ']') {
                displayName = langCode.toUpperCase();
            }

            button.textContent = displayName;
            if (langCode === currentSystemLang) {
                button.textContent += " (" + _t('current_language_indicator') + ")";
            }
            button.dataset.langCode = langCode;
            button.dataset.softrightKey = "softkey_select";

            button.addEventListener('click', function() {
                var selectedAppLang = this.dataset.langCode;
                if (selectedAppLang !== currentSystemLang) {
                    setSystemLanguage(selectedAppLang);
                }
                showScreen('settings-info-screen');
            });
            appLanguageListContainer.appendChild(button);
        });
        showScreen('app-language-settings-screen');
    }


    function loadLocalLanguagesMetadata() {
        IDBHelper.getAllLanguagesMetadata(function(err, metadataList) {
            if (err) { localLanguagesMetadata = []; } else { localLanguagesMetadata = metadataList || []; }

            if (localLanguagesMetadata.length > 0) {
                populateLanguageSelectionScreen();
            } else {
                showScreen('no-languages-prompt-screen');
            }
        });
    }


    function populateLanguageSelectionScreen() {
        showLoadingOverlay('loading_languages');
        IDBHelper.getAllLanguagesMetadata(function(err, langs) {
            hideLoadingOverlay();
            if (err) {
                noDownloadedLanguagesMessage.textContent = _t('error_loading_languages');
                noDownloadedLanguagesMessage.style.display = 'block';
                downloadedLanguagesListContainer.innerHTML = '';
            } else {
                localLanguagesMetadata = langs || [];
                downloadedLanguagesListContainer.innerHTML = '';
                if (langs && langs.length > 0) {
                    noDownloadedLanguagesMessage.style.display = 'none';
                    langs.forEach(function(lang) {
                        var langButton = document.createElement('button');
                        langButton.textContent = lang.name + (lang.version ? ' (v' + lang.version + ')' : '');
                        langButton.dataset.langCode = lang.code;
                        langButton.dataset.langName = lang.name;
                        langButton.dataset.langVersion = lang.version;
                        langButton.dataset.softrightKey = "softkey_select";
                        langButton.addEventListener('click', function() {
                            selectedLanguage = { code: this.dataset.langCode, name: this.dataset.langName, version: this.dataset.langVersion };
                            selectedLangForModeDisplay.textContent = selectedLanguage.name;
                            showScreen('game-mode-screen');
                        });
                        downloadedLanguagesListContainer.appendChild(langButton);
                    });
                } else {
                    noDownloadedLanguagesMessage.textContent = _t('no_downloaded_languages_message_text');
                    noDownloadedLanguagesMessage.style.display = 'block';
                }
            }
            showScreen('language-selection-screen');
        });
    }


    function initializeApp() {
        var preferredSystemLang = localStorage.getItem('appSystemLanguage');
        var detectedDeviceLangFull = navigator.language || navigator.userLanguage;
        var detectedDeviceLangShort = '';
        if (detectedDeviceLangFull) {
            detectedDeviceLangShort = detectedDeviceLangFull.split('-')[0].toLowerCase();
        }

        var initialLangToLoad = defaultSystemLang;

        if (preferredSystemLang && supportedSystemLangs.includes(preferredSystemLang)) { // Uses .includes()
            initialLangToLoad = preferredSystemLang;
        } else if (detectedDeviceLangShort && supportedSystemLangs.includes(detectedDeviceLangShort)) { // Uses .includes()
            initialLangToLoad = detectedDeviceLangShort;
        }


        currentSystemLang = initialLangToLoad;
        document.documentElement.lang = currentSystemLang;

        if (initialLoadingScreen) {
            initialLoadingScreen.style.display = 'flex';
            var h1 = initialLoadingScreen.querySelector('h1[data-i18n-key="app_title"]');
            var p = initialLoadingScreen.querySelector('p[data-i18n-key="loading_ellipsis"]');


            if (h1) h1.textContent = (currentSystemLang === 'bn') ? 'শব্দ ধাঁধা' : 'Word Puzzle';
            if (p) p.textContent = (currentSystemLang === 'bn') ? 'লোড হচ্ছে...' : 'Loading...';
        }


        loadLocale(currentSystemLang, function(errPrimary) {
            if (errPrimary) {
                console.warn('Failed to load determined UI locale: ' + currentSystemLang + '. Attempting default: ' + defaultSystemLang);
                var langToTryNext = defaultSystemLang;

                if (currentSystemLang === defaultSystemLang) {
                    console.error('FATAL: Failed to load default (and primary) locale: ' + defaultSystemLang);
                    if(initialLoadingScreen) {
                        initialLoadingScreen.innerHTML = "<p style='color:red; text-align:center;'>Critical Error: Default UI texts failed to load. Please restart.</p>";
                        if (translations[defaultSystemLang] && translations[defaultSystemLang]['critical_error_default_locale']) {
                             initialLoadingScreen.innerHTML = "<p style='color:red; text-align:center;'>" + translations[defaultSystemLang]['critical_error_default_locale'] + "</p>";
                        }
                    }
                    return;
                }

                currentSystemLang = langToTryNext;
                document.documentElement.lang = currentSystemLang;
                loadLocale(defaultSystemLang, function(errDefault) {
                    if (errDefault) {
                        console.error('FATAL: Failed to load default locale as fallback: ' + defaultSystemLang);
                         if(initialLoadingScreen) {
                            initialLoadingScreen.innerHTML = "<p style='color:red; text-align:center;'>Critical Error: Default UI texts failed to load. Please restart.</p>";
                             if (translations[defaultSystemLang] && translations[defaultSystemLang]['critical_error_default_locale']) {
                                 initialLoadingScreen.innerHTML = "<p style='color:red; text-align:center;'>" + translations[defaultSystemLang]['critical_error_default_locale'] + "</p>";
                            }
                        }
                        return;
                    }
                    proceedWithAppInitialization();
                });
            } else {
                if (currentSystemLang !== defaultSystemLang && !translations[defaultSystemLang]) {
                    loadLocale(defaultSystemLang, function(errDefaultFallback) {
                        if (errDefaultFallback) {
                            console.warn('Could not load default language ' + defaultSystemLang + ' as a translation fallback. Some texts might be missing if primary language file is incomplete.');
                        }
                        proceedWithAppInitialization();
                    });
                } else {
                    proceedWithAppInitialization();
                }
            }
        });
    }

    function proceedWithAppInitialization() {
        applyAllUITranslations();

        var appVersionNodes = document.querySelectorAll('.app-version');
        appVersionNodes.forEach(node => node.textContent = APP_VERSION); // Uses .forEach()
        var appVersionContainerNodes = document.querySelectorAll('.app-version-container');
         appVersionContainerNodes.forEach(node => { // Uses .forEach()
            var labelSpan = node.querySelector('span[data-i18n-key="version_label"]');
            if (labelSpan) labelSpan.textContent = _t('version_label');
        });

        IDBHelper.init(function(err) {
            if (err) {
                console.error("Failed to initialize IndexedDB:", err);
                if(initialLoadingScreen) {
                    var errorHtml = _t('database_error_restart');
                    initialLoadingScreen.innerHTML = "<p style='color:red; text-align:center; padding: 10px;'>" + errorHtml + "</p>";
                }
                return;
            }
            loadLocalLanguagesMetadata();
        });
    }


    function fetchServerManifestAndDisplayLanguages(callback) {
        languageListMessage.textContent = _t('lang_list_loading');
        availableLanguagesListContainer.innerHTML = '';
        NetworkHelper.fetchJSON(SERVER_BASE_URL + MANIFEST_FILE_PATH,
            function(manifest) {
                serverManifest = manifest;
                if (!manifest || !manifest.languages || manifest.languages.length === 0) {
                    languageListMessage.textContent = _t('no_langs_on_server');
                    if (callback) callback(false);
                    return;
                }
                languageListMessage.textContent = "";
                displayAvailableLanguages();
                if (callback) callback(true);
            },
            function(error) { // This error callback expects a single Error object
                languageListMessage.textContent = _t('failed_to_fetch_lang_list');
                languageListMessage.style.color = "red";
                console.error("Fetch manifest error:", error); // 'error' is the Error object from NetworkHelper
                if (callback) callback(false);
            }
        );
        
    }
    function displayAvailableLanguages() {
        if (!serverManifest || !serverManifest.languages) return;
        availableLanguagesListContainer.innerHTML = '';
        serverManifest.languages.forEach(function(serverLang) { // Uses .forEach()
            var localLang = localLanguagesMetadata.find(function(l) { return l.code === serverLang.code; }); // Uses .find()
            var listItem = document.createElement('div');
            listItem.className = 'language-item';

            var nameSpan = document.createElement('span');
            nameSpan.textContent = serverLang.name + (serverLang.version ? ' (v' + serverLang.version + ')' : '');


            var actionButton = document.createElement('button');
            var statusText = "";
            var actionKey = "";

            if (localLang) {
                if (serverLang.version && localLang.version && serverLang.version > localLang.version) {
                    actionKey = 'update';
                    statusText = " [" + _t('status_update_available') + "]";
                } else {
                    actionKey = 'delete';
                    statusText = " [" + _t('status_downloaded') + "]";
                }
            } else {
                actionKey = 'download';
            }
            actionButton.textContent = _t(actionKey);
            actionButton.dataset.action = actionKey;

            nameSpan.textContent += statusText;
            listItem.appendChild(nameSpan);

            actionButton.dataset.langCode = serverLang.code;
            actionButton.dataset.langName = serverLang.name;
            actionButton.dataset.langVersion = serverLang.version;
            actionButton.dataset.langPath = serverLang.path;

            actionButton.dataset.softrightKey = actionKey;

            actionButton.addEventListener('click', handleLanguageAction);
            listItem.appendChild(actionButton);
            availableLanguagesListContainer.appendChild(listItem);
        });
        updateFocusableElements();

        if (focusableElements.length > 0 && (currentFocusIndex < 0 || currentFocusIndex >= focusableElements.length || !document.body.contains(focusableElements[currentFocusIndex]))) {
             var firstInteractiveLangItem = availableLanguagesListContainer.querySelector('button:not([disabled])');
             var idx = firstInteractiveLangItem ? focusableElements.indexOf(firstInteractiveLangItem) : -1; // Check indexOf
             if (idx !== -1) setFocus(idx);
             else if (focusableElements.indexOf(checkForUpdatesButton) !== -1) setFocus(focusableElements.indexOf(checkForUpdatesButton)); // Check indexOf
             else if (focusableElements.length > 0) setFocus(0);
        } else if (focusableElements.length > 0) { setFocus(currentFocusIndex); }
        else { updateSoftkeys(); }
    }
    function handleLanguageAction(event) {
        var button = event.target.closest('button'); // Uses .closest()
        if (!button) return;

        var action = button.dataset.action;
        var langCode = button.dataset.langCode;
        var langName = button.dataset.langName;
        var langVersion = button.dataset.langVersion;
        var langPath = button.dataset.langPath;

        if (action === 'delete') {
            if (confirm(_t('confirm_delete_language', { langName: langName }))) {
                showLoadingOverlay('deleting_param', { langName: langName });
                IDBHelper.deleteLanguage(langCode, function(err) {
                    hideLoadingOverlay();
                    if (err) {
                        alert(_t('problem_deleting_lang', { langName: langName }));
                    } else {
                        alert(_t('lang_deleted_successfully', { langName: langName }));
                        localLanguagesMetadata = localLanguagesMetadata.filter(function(l) { return l.code !== langCode; });
                        displayAvailableLanguages();
                    }
                });
            }
            return;
        }


        var fullPath = SERVER_BASE_URL + langPath;
        var loadingMessageKey = (action === 'download' ? 'downloading_lang' : 'updating_lang');
        showLoadingOverlay(loadingMessageKey, { langName: langName });

        NetworkHelper.fetchJSON(fullPath,
            function(puzzlesData) {
                if (!Array.isArray(puzzlesData)) {
                    hideLoadingOverlay();
                    alert(_t('lang_data_incorrect_format', { langName: langName }));
                    return;
                }
                var processedPuzzles = preparePuzzles(puzzlesData);
                if (processedPuzzles.length === 0 && puzzlesData.length > 0) {
                     hideLoadingOverlay();
                     alert(_t('lang_data_no_valid_puzzles', { langName: langName }));
                     return;
                }

                IDBHelper.saveLanguagePuzzles(langCode, processedPuzzles, function(errPuzzles) {
                    if (errPuzzles) {
                        hideLoadingOverlay();
                        alert(_t('lang_puzzle_save_error', { langName: langName }));
                        return;
                    }
                    var metadata = { code: langCode, name: langName, version: langVersion, path: langPath };
                    IDBHelper.saveLanguageMetadata(metadata, function(errMeta) {
                        hideLoadingOverlay();
                        if (errMeta) {
                            alert(_t('lang_metadata_save_error', { langName: langName }));
                        } else {
                            var actionTextKey = (action === 'download' ? 'action_downloaded_text' : 'action_updated_text');
                            alert(_t('lang_action_successful', { langName: langName, action: _t(actionTextKey) }));

                            var index = localLanguagesMetadata.findIndex(function(l) { return l.code === langCode; }); // Uses .findIndex()
                            if (index > -1) {
                                localLanguagesMetadata[index] = metadata;
                            } else {
                                localLanguagesMetadata.push(metadata);
                            }
                            displayAvailableLanguages();
                        }
                    });
                });
            },
            function(error) { // This error callback expects a single Error object
                hideLoadingOverlay();
                var actionTextKey = (action === 'download' ? 'action_downloaded_text' : 'action_updated_text');
                alert(_t('lang_action_failed_network', { langName: langName, action: _t(actionTextKey) }));
                console.error("Error fetching language data for " + langName + ":", error); // 'error' is the Error object
            }
        );
    }
    function checkForAllUpdates() {
        if (!serverManifest || !serverManifest.languages || serverManifest.languages.length === 0) {
             showLoadingOverlay('checking_for_updates');
            fetchServerManifestAndDisplayLanguages(function(success){
                hideLoadingOverlay();
                if(success && serverManifest && serverManifest.languages.length > 0) {
                    performUpdateCheck();
                } else if (success && (!serverManifest || serverManifest.languages.length === 0)) {
                    alert(_t('no_langs_on_server_for_updates'));
                }
                else {
                    alert(_t('error_loading_updates_list'));
                }
            });
            return;
        }
        performUpdateCheck();
    }
    function performUpdateCheck() {
        showLoadingOverlay('checking_for_updates');
        var updatesFound = 0;
        var localLangsCount = localLanguagesMetadata.length;

        if (localLangsCount === 0) {
            hideLoadingOverlay();
            alert(_t('no_langs_downloaded_for_update'));
            return;
        }

        if (!serverManifest || !serverManifest.languages || serverManifest.languages.length === 0) {
            hideLoadingOverlay();
            alert(_t('cant_check_updates_no_server_manifest'));
            return;
        }

        localLanguagesMetadata.forEach(function(localLang) { // Uses .forEach()
            var serverLangEquivalent = serverManifest.languages.find(function(sl) { return sl.code === localLang.code; }); // Uses .find()
            if (serverLangEquivalent && serverLangEquivalent.version && localLang.version &&
                parseFloat(serverLangEquivalent.version) > parseFloat(localLang.version)) {
                updatesFound++;
            }
        });

        hideLoadingOverlay();
        if (updatesFound > 0) {
            alert(_t('updates_found_count', { count: updatesFound }));
        } else {
            alert(_t('all_langs_up_to_date'));
        }
        displayAvailableLanguages();
    }
    function startGame(numQuestions) {
        if (!selectedLanguage) {
            alert(_t('select_game_language_first'));
            populateLanguageSelectionScreen();
            return;
        }
        showLoadingOverlay('loading_puzzles');
        IDBHelper.getLanguagePuzzles(selectedLanguage.code, function(err, puzzlesFromDB) {
            hideLoadingOverlay();
            if (err || !puzzlesFromDB || puzzlesFromDB.length === 0) {
                alert(_t('error_loading_puzzles_for_lang', { langName: selectedLanguage.name }));
                showScreen('game-mode-screen');
                return;
            }

            var allAvailablePuzzles = shuffleArray(puzzlesFromDB.slice());
            if (allAvailablePuzzles.length === 0) {
                alert(_t('no_valid_puzzles_for_lang', { langName: selectedLanguage.name }));
                showScreen('game-mode-screen');
                return;
            }

            totalPuzzlesInGame = Math.min(numQuestions, allAvailablePuzzles.length);

            if (totalPuzzlesInGame === 0) {
                 alert(_t('not_enough_puzzles_or_zero_param', {available: allAvailablePuzzles.length, requested: numQuestions}));
                 showScreen(numQuestions > 0 ? 'game-mode-screen' : 'custom-setup-screen'); return;
            }

            currentPuzzlesList = allAvailablePuzzles.slice(0, totalPuzzlesInGame);
            score = 0;
            currentPuzzleIndex = 0;

            scoreDisplay.textContent = score;
            if (gameScreenLanguageNameDisplay) gameScreenLanguageNameDisplay.textContent = selectedLanguage.name;
            totalPuzzlesDisplay.textContent = totalPuzzlesInGame;

            if (gameButtonsContainer) gameButtonsContainer.style.display = 'flex';
            showScreen('game-screen');
            if (currentScreen === 'game') loadNewPuzzle();
        });
    }
    function setGameButtonsState(inputDisabled, submitVisible, revealVisible, nextVisible) {
        if (answerInput) answerInput.disabled = inputDisabled;
        if (submitButton) {
            submitButton.style.display = submitVisible ? 'block' : 'none'; submitButton.disabled = !submitVisible;
        }
        if (revealAnswerButton) {
            revealAnswerButton.style.display = revealVisible ? 'block' : 'none'; revealAnswerButton.disabled = !revealVisible;
        }
        if (nextQuestionButton) {
            nextQuestionButton.style.display = nextVisible ? 'block' : 'none'; nextQuestionButton.disabled = !nextVisible;
        }

        if (gameButtonsContainer) {
             gameButtonsContainer.style.display = (submitVisible || revealVisible || nextVisible) ? 'flex' : 'none';
        }
    }
    function loadNewPuzzle() {
        setGameButtonsState(false, true, true, false);

        if (currentPuzzleIndex < totalPuzzlesInGame) {
            var currentPuzzle = currentPuzzlesList[currentPuzzleIndex];
            if (!currentPuzzle || !currentPuzzle.shuffled || currentPuzzle.shuffled.trim() === "") {
                puzzleContainer.innerHTML = "<p style='color:red;'>" + _t('puzzle_load_error_ingame') + "</p>";
                currentPuzzleIndex++;
                setTimeout(currentPuzzleIndex < totalPuzzlesInGame ? loadNewPuzzle : endGame, 1500);
                return;
            }

            puzzleContainer.innerHTML = '';
            var glyphs = getBanglaGlyphsForDisplay(currentPuzzle.shuffled);
            if (glyphs.length === 0) {
                glyphs = getBanglaGlyphsForDisplay(currentPuzzle.original);
            }
            if (glyphs.length === 0) {
                 puzzleContainer.innerHTML = "<p style='color:orange;'>" + _t('word_not_found_ingame') + "</p>";
                 currentPuzzleIndex++;
                 setTimeout(currentPuzzleIndex < totalPuzzlesInGame ? loadNewPuzzle : endGame, 1500); return;
            }

            glyphs.forEach(function (charPart, index) { // Uses .forEach()
                var span = document.createElement('span');
                span.textContent = charPart;
                span.classList.add('puzzle-char');
                span.style.animationDelay = (index * 0.05) + 's';
                puzzleContainer.appendChild(span);
            });

            answerInput.value = '';
            resultDisplay.textContent = '';
            resultDisplay.className = '';
            currentPuzzleCountDisplay.textContent = currentPuzzleIndex + 1;

            updateFocusableElements();
            var inputIdx = focusableElements.indexOf(answerInput); // Check indexOf
            if (inputIdx !== -1) setFocus(inputIdx);
            else if (focusableElements.length > 0) setFocus(0);
            else updateSoftkeys();

        } else {
            endGame();
        }

        getKaiAd({
            publisher: '080b82ab-b33a-4763-a498-50f464567e49',
            app: 'word_puzzle',
            slot: 'word_puzzle',
            onerror: err => console.error('Custom catch:', err),
            onready: ad => {
                ad.call('display');
            }
        });
    }
    function checkAnswer() {
        if (currentPuzzleIndex >= totalPuzzlesInGame || (answerInput && answerInput.disabled)) return;

        var userAnswer = answerInput.value.trim();
        if (userAnswer === '') {
             resultDisplay.textContent = _t('please_enter_answer');
             resultDisplay.className = 'warning';
             if (answerInput && typeof answerInput.focus === 'function') answerInput.focus();
             return;
        }

        setGameButtonsState(true, false, false, false);

        var cleanUserAnswer = userAnswer.toLowerCase().replace(/\s+/g, '');

        var currentOriginalWord = (currentPuzzlesList[currentPuzzleIndex] && currentPuzzlesList[currentPuzzleIndex].original) || "";
        var correctAnswer = currentOriginalWord.replace(/\s+/g, '').toLowerCase();

        if (cleanUserAnswer === correctAnswer) {
            resultDisplay.textContent = _t('correct_answer_feedback');
            resultDisplay.className = 'correct';
            score++;
            scoreDisplay.textContent = score;
        } else {
            resultDisplay.innerHTML = _t('wrong_answer_feedback_correct_is', { correctWord: currentOriginalWord.replace(/\s+/g, ' ') });
            resultDisplay.className = 'incorrect';
        }
        currentPuzzleIndex++;

        setTimeout(function() {
            if (currentPuzzleIndex < totalPuzzlesInGame) {
                loadNewPuzzle();
            } else {
                endGame();
            }
        }, 1800);
    }
    function revealAnswerAction() {
        if (currentPuzzleIndex >= totalPuzzlesInGame || (revealAnswerButton && revealAnswerButton.disabled)) return;

        setGameButtonsState(true, false, false, true);

        var currentOriginal = (currentPuzzlesList[currentPuzzleIndex] && currentPuzzlesList[currentPuzzleIndex].original) || _t('answer_unavailable');
        var chars = getBanglaGlyphsForDisplay(currentOriginal);

        puzzleContainer.innerHTML = '';
        if (chars.length === 0 && currentOriginal === _t('answer_unavailable')) {
             puzzleContainer.innerHTML = "<p style='color:red;'>" + _t('error_loading_answer_ingame') + "</p>";
        } else if (chars.length === 0) {
            puzzleContainer.innerHTML = "<p style='color:orange;'>" + _t('word_not_found_ingame') + "</p>";
        }
        else {
            chars.forEach(function (charPart, index) { // Uses .forEach()
                var span = document.createElement('span');
                span.textContent = charPart;
                span.classList.add('puzzle-char', 'revealed-char');
                span.style.animationDelay = (index * 0.1) + 's';
                puzzleContainer.appendChild(span);
            });
        }
        resultDisplay.textContent = _t('revealed_answer_feedback_is', { correctWord: currentOriginal.replace(/\s+/g, '') });
        resultDisplay.className = 'revealed';

        updateFocusableElements();
        var nextBtnIdx = focusableElements.indexOf(nextQuestionButton); // Check indexOf
        if (nextBtnIdx !== -1) setFocus(nextBtnIdx);
        else if (focusableElements.length > 0) setFocus(0);
        else updateSoftkeys();
    }
    function nextQuestionAction() {
        if (nextQuestionButton && nextQuestionButton.disabled) return;
        currentPuzzleIndex++;
        loadNewPuzzle();
    }
    function endGame() {
        finalScoreMessage.textContent = _t('final_score_message_text', {
            langName: (selectedLanguage ? selectedLanguage.name : _t('status_na')),
            score: score,
            total: totalPuzzlesInGame
        });
        if (gameButtonsContainer) gameButtonsContainer.style.display = 'none';
        showScreen('game-over-screen');
        getKaiAd({
            publisher: '080b82ab-b33a-4763-a498-50f464567e49',
            app: 'word_puzzle',
            slot: 'word_puzzle',
            onerror: err => console.error('Custom catch:', err),
            onready: ad => {
                ad.call('display');
            }
        });
    }
    function quitGameToGameMode() {
        if (gameButtonsContainer) gameButtonsContainer.style.display = 'none';
        showScreen('game-mode-screen');
    }


    function setupEventListeners() {
        goToLanguageManagementButton.addEventListener('click', function() { previousScreen = currentScreen; showScreen('language-management-screen'); fetchServerManifestAndDisplayLanguages(); });
        exitAppPromptButton.addEventListener('click', function() { if (typeof window.close === 'function') window.close(); else console.warn("window.close not available."); });
        manageLanguagesFromSelectButton.addEventListener('click', function() { previousScreen = currentScreen; showScreen('language-management-screen'); fetchServerManifestAndDisplayLanguages(); });

        startRandomGameModeButton.addEventListener('click', function() {
            if (!selectedLanguage) { alert(_t('select_game_language_first')); populateLanguageSelectionScreen(); return; }
            startGame(20);
        });
        startCustomGameModeButton.addEventListener('click', function() {
            if (!selectedLanguage) { alert(_t('select_game_language_first')); populateLanguageSelectionScreen(); return; }

            IDBHelper.getLanguagePuzzles(selectedLanguage.code, function(err, puzzles) {
                var totalAvailable = 0;
                if (!err && puzzles && puzzles.length > 0) {
                    totalAvailable = puzzles.length;
                }
                var maxText = totalAvailable > 0 ? totalAvailable : _t('status_na');
                if(customGameQuestionsLabel) customGameQuestionsLabel.innerHTML = _t('how_many_questions_label_dynamic', {max_val: maxText});
                customNumberInput.max = totalAvailable > 0 ? totalAvailable : 1;
                customNumberInput.value = Math.min(5, totalAvailable > 0 ? totalAvailable : 1);
                showScreen('custom-setup-screen');
            });
        });
        backToLangSelectButton.addEventListener('click', function() { populateLanguageSelectionScreen(); });
        goToMainSettingsButton.addEventListener('click', function() { showScreen('settings-info-screen'); });


        instructionsButtonSettings.addEventListener('click', function() { showScreen('instructions-screen'); });
        aboutButtonSettings.addEventListener('click', function() { showScreen('about-screen'); });
        manageLanguagesSettingsButton.addEventListener('click', function() { previousScreen = currentScreen; showScreen('language-management-screen'); fetchServerManifestAndDisplayLanguages(); });
        appLanguageSettingsButton.addEventListener('click', function() { populateAppLanguageSettingsScreen(); });
        backToGameModeFromSettingsButton.addEventListener('click', function() { showScreen('game-mode-screen'); });


        startCustomGameButton.addEventListener('click', function () {
            if (!selectedLanguage) { alert(_t('select_game_language_first')); populateLanguageSelectionScreen(); return; }
            var num = parseInt(customNumberInput.value, 10);
            var maxAllowed = parseInt(customNumberInput.max, 10);
            if (isNaN(num) || num <= 0 || (maxAllowed > 0 && num > maxAllowed)) {
                alert(_t('enter_number_between_param', {min: 1, max: (maxAllowed > 0 ? maxAllowed : _t('status_na'))}));
                if (customNumberInput && typeof customNumberInput.focus === 'function') customNumberInput.focus();
            } else {
                startGame(num);
            }
        });
        backToGameModeButton.addEventListener('click', function() { showScreen('game-mode-screen'); });


        checkForUpdatesButton.addEventListener('click', checkForAllUpdates);
        backFromLangManageButton.addEventListener('click', function() {
            if (previousScreen === 'no-languages-prompt' && localLanguagesMetadata.length > 0) {
                populateLanguageSelectionScreen();
            } else if (previousScreen && document.getElementById(previousScreen + "-screen")) {
                showScreen(previousScreen + "-screen");
            } else {
                if (localLanguagesMetadata.length > 0) populateLanguageSelectionScreen();
                else showScreen('settings-info-screen');
            }
        });

        backFromAppLangSettingsButton.addEventListener('click', function() { showScreen('settings-info-screen'); });


        backToSettingsFromInstructionsButton.addEventListener('click', function() { showScreen('settings-info-screen'); });
        backToSettingsFromAboutButton.addEventListener('click', function() { showScreen('settings-info-screen'); });


        submitButton.addEventListener('click', checkAnswer);
        revealAnswerButton.addEventListener('click', revealAnswerAction);
        nextQuestionButton.addEventListener('click', nextQuestionAction);
        if(quitGameButton) quitGameButton.addEventListener('click', quitGameToGameMode);
        answerInput.addEventListener('keypress', function (event) { if (event.key === 'Enter' && answerInput && !answerInput.disabled) checkAnswer(); });
        customNumberInput.addEventListener('keypress', function (event) { if (event.key === 'Enter' && customNumberInput && !customNumberInput.disabled) startCustomGameButton.click(); });


        playAgainModeSelectButton.addEventListener('click', function() { showScreen('game-mode-screen'); });
        changeLanguageGameOverButton.addEventListener('click', function() { populateLanguageSelectionScreen(); });
        mainMenuGameOverButton.addEventListener('click', function() {
            if (selectedLanguage) {
                showScreen('game-mode-screen');
            } else {
                populateLanguageSelectionScreen();
            }
        });

        document.addEventListener('keydown', handleKeyDown);
    }


    function handleKeyDown(event) {
        var activeElement = document.activeElement;
        var handled = false;


        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            if (event.key === 'Enter') {
                if (activeElement === answerInput && !answerInput.disabled) { checkAnswer(); handled = true; }
                else if (activeElement === customNumberInput && !customNumberInput.disabled) { startCustomGameButton.click(); handled = true; }
            } else if (['ArrowUp', 'ArrowDown'].indexOf(event.key) !== -1 && activeElement.type === "number") { // Check indexOf
                return;
            } else if (['ArrowLeft', 'ArrowRight'].indexOf(event.key) !== -1 && activeElement.tagName === 'INPUT') { // Check indexOf
                 if (event.key !== 'SoftLeft' && event.key !== 'F1' && event.key !== 'SoftRight' && event.key !== 'F2') return;
            } else if (event.key === 'Backspace' && activeElement.tagName === 'INPUT' && activeElement.value.length > 0) {
                return;
            }
        }


        if (!handled && currentScreen === 'game' && event.key === '#') {
            if (revealAnswerButton && revealAnswerButton.style.display !== 'none' && !revealAnswerButton.disabled) {
                revealAnswerButton.click();
                handled = true;
            }
        }

        if (!handled) {
            switch (event.key) {
                case 'ArrowUp':
                    if (activeElement && (activeElement.classList.contains('content-box') || activeElement.classList.contains('scrollable-list')) && activeElement.scrollTop > 0) {
                        activeElement.scrollTop -= 30;
                        handled = true;
                    } else if (focusableElements.length > 0) {
                        setFocus(currentFocusIndex - 1);
                        handled = true;
                    }
                    break;
                case 'ArrowDown':
                    if (activeElement && (activeElement.classList.contains('content-box') || activeElement.classList.contains('scrollable-list')) && activeElement.scrollTop < (activeElement.scrollHeight - activeElement.clientHeight)) {
                        activeElement.scrollTop += 30;
                        handled = true;
                    } else if (focusableElements.length > 0) {
                        setFocus(currentFocusIndex + 1);
                        handled = true;
                    }
                    break;
                case 'Enter':
                    if (currentFocusIndex !== -1 && focusableElements[currentFocusIndex] && typeof focusableElements[currentFocusIndex].click === 'function') {
                        focusableElements[currentFocusIndex].click();
                    } else if (activeElement && activeElement.classList.contains('content-box') && (activeElement.scrollHeight > activeElement.clientHeight)) {
                        if (softkeyCenter.textContent === _t("softkey_scroll")) {
                             if (activeElement.scrollTop < (activeElement.scrollHeight - activeElement.clientHeight)) activeElement.scrollTop += 30;
                             else activeElement.scrollTop = 0;
                        }
                    }
                    handled = true;
                    break;
                case 'SoftLeft': case 'F1': handleSoftKey('left'); handled = true; break;
                case 'SoftRight': case 'F2': handleSoftKey('right'); handled = true; break;
                case 'Backspace':
                    var backTargetButtonId = null; var directAction = null;

                    var currentScreenElement = document.getElementById(currentScreen + '-screen');
                    if (currentScreenElement) {
                        var explicitBackButton = currentScreenElement.querySelector('button[data-softleft-key="softkey_back"], button[data-i18n-key="back"], button[data-i18n-key="back_to_menu"]');
                        if (explicitBackButton && explicitBackButton.offsetParent !== null && !explicitBackButton.disabled) {
                            directAction = function() { explicitBackButton.click(); };
                        }
                    }

                    if (!directAction) {
                        switch(currentScreen) {
                            case 'game': directAction = quitGameToGameMode; break;
                            case 'custom-setup': backTargetButtonId = 'back-to-game-mode-button'; break;
                            case 'instructions': backTargetButtonId = 'back-to-settings-from-instructions-button'; break;
                            case 'about': backTargetButtonId = 'back-to-settings-from-about-button'; break;
                            case 'language-management': backTargetButtonId = 'back-from-lang-manage-button'; break;
                            case 'game-mode': backTargetButtonId = 'back-to-lang-select-button'; break;
                            case 'app-language-settings': backTargetButtonId = 'back-from-app-lang-settings-button'; break;
                            case 'language-selection':
                                if (localLanguagesMetadata.length === 0) {
                                    if (exitAppPromptButton) directAction = function() { exitAppPromptButton.click(); };
                                } else if(manageLanguagesFromSelectButton && manageLanguagesFromSelectButton.offsetParent !== null) {
                                }
                                break;
                            case 'settings-info': backTargetButtonId = 'back-to-game-mode-from-settings-button'; break;
                            case 'game-over':
                                if(mainMenuGameOverButton && mainMenuGameOverButton.offsetParent !== null) directAction = function() { mainMenuGameOverButton.click(); };
                                else if (playAgainModeSelectButton && playAgainModeSelectButton.offsetParent !== null) directAction = function() { playAgainModeSelectButton.click(); };
                                break;
                            case 'no-languages-prompt':
                                if (exitAppPromptButton && exitAppPromptButton.offsetParent !== null) directAction = function() { exitAppPromptButton.click(); };
                                break;
                        }
                    }

                    if (directAction) directAction();
                    else if (backTargetButtonId) {
                        var btn = document.getElementById(backTargetButtonId);
                        if (btn && typeof btn.click === 'function' && btn.offsetParent !== null && !btn.disabled) btn.click();
                    } else if (currentScreen !== 'initial-loading' && currentScreen !== 'language-selection' && currentScreen !== 'no-languages-prompt' && currentScreen !== 'game-mode') {
                    }
                    handled = true;
                    break;
            }
        }
        if (handled) event.preventDefault();
    }
    function handleSoftKey(type) {
        var softkeyLabelElement = (type === 'left') ? softkeyLeft : softkeyRight;
        var currentSoftkeyText = softkeyLabelElement.textContent;
        if (!currentSoftkeyText || currentSoftkeyText.trim() === "") return;

        var focusedElement = (currentFocusIndex !== -1 && focusableElements[currentFocusIndex]) ? focusableElements[currentFocusIndex] : null;


        if (focusedElement) {
            var softkeyDataAttr = (type === 'left') ? 'softleftKey' : 'softrightKey';
            if (focusedElement.dataset[softkeyDataAttr] && _t(focusedElement.dataset[softkeyDataAttr]) === currentSoftkeyText) {
                if (typeof focusedElement.click === 'function') {
                    focusedElement.click();
                    return;
                }
            }
        }


        if (type === 'left') {
            if (currentScreen === 'game' && currentSoftkeyText === _t("softkey_reveal_hash") && revealAnswerButton && !revealAnswerButton.disabled) revealAnswerButton.click();
            else if (currentScreen === 'game' && currentSoftkeyText === _t("softkey_menu") && quitGameButton && !quitGameButton.disabled) quitGameButton.click();
            else if (currentScreen === 'custom-setup' && currentSoftkeyText === _t("softkey_back") && backToGameModeButton) backToGameModeButton.click();
            else if (currentScreen === 'instructions' && currentSoftkeyText === _t("softkey_back") && backToSettingsFromInstructionsButton) backToSettingsFromInstructionsButton.click();
            else if (currentScreen === 'about' && currentSoftkeyText === _t("softkey_back") && backToSettingsFromAboutButton) backToSettingsFromAboutButton.click();
            else if (currentScreen === 'language-selection' && currentSoftkeyText === _t(manageLanguagesFromSelectButton.dataset.softleftKey || "softkey_options") && manageLanguagesFromSelectButton) manageLanguagesFromSelectButton.click();
            else if (currentScreen === 'game-mode' && currentSoftkeyText === _t("softkey_back") && backToLangSelectButton) backToLangSelectButton.click();
            else if (currentScreen === 'language-management' && currentSoftkeyText === _t("softkey_back") && backFromLangManageButton) backFromLangManageButton.click();
            else if (currentScreen === 'settings-info' && currentSoftkeyText === _t("softkey_back") && backToGameModeFromSettingsButton) backToGameModeFromSettingsButton.click();
            else if (currentScreen === 'app-language-settings' && currentSoftkeyText === _t("softkey_back") && backFromAppLangSettingsButton) backFromAppLangSettingsButton.click();

        } else if (type === 'right') {
            if (currentScreen === 'game' && currentSoftkeyText === _t("softkey_next") && nextQuestionButton && !nextQuestionButton.disabled) nextQuestionButton.click();
            else if (currentScreen === 'game' && currentSoftkeyText === _t("softkey_submit") && submitButton && !submitButton.disabled) submitButton.click();
            else if (currentScreen === 'custom-setup' && currentSoftkeyText === _t("softkey_start") && startCustomGameButton) startCustomGameButton.click();
            else if (currentScreen === 'game-over' && (currentSoftkeyText === _t(playAgainModeSelectButton.dataset.softrightKey || "softkey_play")) && playAgainModeSelectButton) playAgainModeSelectButton.click();
            else if (currentScreen === 'no-languages-prompt' && (currentSoftkeyText === _t(goToLanguageManagementButton.dataset.softrightKey || "softkey_download")) && goToLanguageManagementButton) goToLanguageManagementButton.click();
            else if (currentSoftkeyText === _t("softkey_select") && focusedElement && typeof focusedElement.click === 'function') {
                focusedElement.click();
            }
             else if (focusedElement && focusedElement.dataset.softrightKey && _t(focusedElement.dataset.softrightKey) === currentSoftkeyText && typeof focusedElement.click === 'function') {
                focusedElement.click();
            }
        }
    }

    // Assume IDBHelper is defined elsewhere or provided.
    // For this example, I'll add a placeholder if it's not in the original snippet.
    if (typeof IDBHelper === 'undefined') {
        window.IDBHelper = {
            init: function(cb) { console.warn("IDBHelper.init called - using placeholder."); if(cb) cb(); },
            getAllLanguagesMetadata: function(cb) { console.warn("IDBHelper.getAllLanguagesMetadata called - using placeholder."); if(cb) cb(null, []); },
            deleteLanguage: function(code, cb) { console.warn("IDBHelper.deleteLanguage called - using placeholder."); if(cb) cb(); },
            saveLanguagePuzzles: function(code, puzzles, cb) { console.warn("IDBHelper.saveLanguagePuzzles called - using placeholder."); if(cb) cb(); },
            saveLanguageMetadata: function(meta, cb) { console.warn("IDBHelper.saveLanguageMetadata called - using placeholder."); if(cb) cb(); },
            getLanguagePuzzles: function(code, cb) { console.warn("IDBHelper.getLanguagePuzzles called - using placeholder."); if(cb) cb(null, []); }
        };
    }

    setupEventListeners();
    initializeApp();



    getKaiAd({
        publisher: '080b82ab-b33a-4763-a498-50f464567e49',
        app: 'word_puzzle',
        slot: 'word_puzzle',
        onerror: err => console.error('Custom catch:', err),
        onready: ad => {
            ad.call('display');
        }
    });
});
