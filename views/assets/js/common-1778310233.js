/* -----------------------------------------------
/* Authors: QuiteAFancyEmerald, Yoct, b4kt, and OlyB
/* GNU Affero General Public License v3.0: https://www.gnu.org/licenses/agpl-3.0.en.html
/* MAIN InvisiProxy LTS Common Script
/* ----------------------------------------------- */

// Encase everything in a new scope so that variables are not accidentally
// attached to the global scope.
(() => {

/* GENERAL URL HANDLERS */

// To be defined after the document has fully loaded.
let uvConfig = {};
let sjEncode = {};
// Get the preferred apex domain name. Not exactly apex, as any
// subdomain other than those listed will be ignored.
const getDomain = () =>
    location.host.replace(/^(?:www|beta)\./, ''),
  // This is used for stealth mode when visiting external sites.
  goFrame = (url) => {
    localStorage.setItem('{{hu-lts}}-frame-url', url);
    if (location.pathname !== '{{route}}{{/s}}')
      location.href = '{{route}}{{/s}}?cache={{cacheVal}}';
    else document.getElementById('frame').src = url;
  },
  /* Used to set functions for the goProx object at the bottom.
   * See the goProx object at the bottom for some usage examples
   * on the URL handlers, omnibox functions, and the uvUrl function.
   */
  urlHandler = (parser) =>
    typeof parser === 'function'
      ? // Return different functions based on whether a URL has already been set.
        // Should help avoid confusion when using or adding to the goProx object.
        (url, mode) => {
          if (!url) return;
          url = parser(url);
          mode = `${mode}`.toLowerCase();
          if (mode === 'stealth' || mode == 1) goFrame(url);
          else if (mode === 'window' || mode == 0) location.href = url;
          else return url;
        }
      : (mode) => {
          mode = `${mode}`.toLowerCase();
          if (mode === 'stealth' || mode == 1) goFrame(parser);
          else if (mode === 'window' || mode == 0) location.href = parser;
          else return parser;
        },
  openBlankCloak = () => {
      try {
        const newWindow = window.open('about:blank', '_blank');
        if (!newWindow) return null;
        const iframe = newWindow.document.createElement('iframe');
        const styles = {
          border: 'none',
          width: '100%',
          height: '100%',
          margin: '0',
          overflow: 'hidden',
        };
        Object.assign(iframe.style, styles);
        iframe.src = location.href;
        newWindow.document.body.appendChild(iframe);
        return newWindow;
      } catch (e) {
        console.error('Blank cloaking failed:', e);
        return null;
      }
    },
  openBlobCloak = () => {
    try {
      const icon =
        (document.querySelector("link[rel*='icon']") || {}).href || '';
      const html = `<!DOCTYPE html><html><head><title>${
        document.title
      }</title><link rel="icon" href="${icon}"><style>html,body{height:100%;margin:0;padding:0;overflow:hidden;}</style></head><body><iframe style="border:none;width:100%;height:100%;margin:0;overflow:hidden;" src="${
        location.href
      }"></iframe></body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, '_blank');
      return newWindow;
    } catch (e) {
      console.error('Blob cloaking failed:', e);
      return null;
    }
  },
  // An asynchronous version of the function above, just in case.
  asyncUrlHandler = (parser) => async (url, mode) => {
    if (!url) return;
    if (typeof parser === 'function') url = await parser(url);
    mode = `${mode}`.toLowerCase();
    if (mode === 'stealth' || mode == 1) goFrame(url);
    else if (mode === 'window' || mode == 0) location.href = url;
    else return url;
  };

/* READ SETTINGS */

const storageId = '{{hu-lts}}-storage',
  storageObject = () => JSON.parse(localStorage.getItem(storageId)) || {},
  readStorage = (name) => storageObject()[name];

/* OMNIBOX */

const searchEngines = Object.freeze({
    '{{Startpage}}': 'startpage.com/sp/search?query=',
    // '{{Google}}': 'google.com/search?q=',
    '{{Bing}}': 'bing.com/search?q=',
    '{{DuckDuckGo}}': 'duckduckgo.com/?q=',
    '{{Brave}}': 'search.brave.com/search?q=',
  }),
  defaultSearch = '{{defaultSearch}}',
  autocompletes = Object.freeze({
    // Startpage has used both Google's and Bing's autocomplete.
    // For now, just use Bing.
    '{{Startpage}}': 'www.bing.com/AS/Suggestions?csr=1&cvid=0&qry=',
    // '{{Google}}': 'www.google.com/complete/search?client=gws-wiz&callback=_&q=',
    '{{Bing}}': 'www.bing.com/AS/Suggestions?csr=1&cvid=0&qry=',
    '{{DuckDuckGo}}': 'duckduckgo.com/ac/?q=',
    '{{Brave}}': 'search.brave.com/api/suggest?q=',
  }),
  autocompleteUrls = Object.values(autocompletes).map(
    (url) => 'https://' + url
  ),
  responseDelimiter = '\ue000',
  formatSuggestion = (
    suggestion,
    delimiters,
    newDelimiters = [responseDelimiter]
  ) => {
    for (let i = 0; i < delimiters.length; i++)
      suggestion = suggestion.replaceAll(
        delimiters[i],
        newDelimiters[i] || newDelimiters[0]
      );
    return suggestion;
  },
  responseHandlers = Object.freeze({
    '{{Startpage}}': (jsonData) => responseHandlers['{{Bing}}'](jsonData),
    /* '{{Google}}': (jsonData) =>
      jsonData[0].map(([suggestion]) =>
        formatSuggestion(suggestion, ['<b>', '</b>'])
      ),
    */
    '{{Bing}}': (jsonData) =>
      jsonData.s.map(({ q }) => formatSuggestion(q, ['\ue000', '\ue001'])),
    '{{DuckDuckGo}}': (jsonData) => jsonData.map(({ phrase }) => phrase),
    '{{Brave}}': (jsonData) => jsonData[1],
  });

// Get the autocomplete results for a given search query in JSON format.
const requestAC = async (
  baseUrl,
  query,
  parserFunc = (url) => url,
  params = {}
) => {
  switch (parserFunc) {
    case sjUrl: {
      // Ask Scramjet to process the autocomplete request. Processed results will
      // be returned to an event handler and are updated from there.
      params.port.postMessage({
        type: params.searchType,
        request: {
          url: parserFunc(baseUrl + encodeURIComponent(query)),
          headers: new Map([['Date', params.time]]),
        },
      });
      break;
    }
  }
};

let lastUpdated = Date.parse(new Date().toUTCString());
const updateAC = (listElement, searchResults, time) => {
  if (time < lastUpdated) return;
  else lastUpdated = time;
  // Update the data for the results.
  listElement.textContent = '';
  for (let i = 0; i < searchResults.length; i++) {
    let suggestion = document.createElement('li');
    suggestion.tabIndex = 0;
    suggestion.append(
      ...searchResults[i].split(responseDelimiter).map((text, bolded) => {
        if (bolded % 2) {
          let node = document.createElement('b');
          node.textContent = text;
          return node;
        }
        return text;
      })
    );
    listElement.appendChild(suggestion);
  }
};

// Default search engine is set to DuckDuckGo. Intended to work just like the usual
// bar at the top of a browser.
const getSearchTemplate = (
    searchEngine = searchEngines[readStorage('SearchEngine')] ||
      searchEngines[defaultSearch]
  ) => `https://${searchEngine}%s`,
  // Like an omnibox, return the results of a search engine if search terms are
  // provided instead of a URL.
  search = (input) => {
    try {
      // Return the input if it is already a valid URL.
      // eg: https://example.com, https://example.com/test?q=param
      return new URL(input) + '';
    } catch (e) {
      // Continue if it is invalid.
    }

    try {
      // Check if the input is valid when http:// is added to the start.
      // eg: example.com, https://example.com/test?q=param
      const url = new URL(`http://${input}`);
      // Return only if the hostname has a TLD or a subdomain.
      if (url.hostname.indexOf('.') != -1) return url + '';
    } catch (e) {
      // Continue if it is invalid.
    }

    // Treat the input as a search query instead of a website.
    return getSearchTemplate().replace('%s', encodeURIComponent(input));
  },
  // Parse a URL to use with Ultraviolet.
  uvUrl = (url) => {
    try {
      url = location.origin + uvConfig.prefix + uvConfig.encodeUrl(search(url));
    } catch (e) {
      // This is for cases where the Ultraviolet scripts have not been loaded.
      url = search(url);
    }
    return url;
  },
  // Parse a URL to use with Scramjet.
  sjUrl = (url) => {
    try {
      url = location.origin + sjEncode(search(url));
    } catch (e) {
      // This is for cases where the SJ scripts have not been loaded.
      url = search(url);
    }
    return url;
  }

/* To use:
 * goProx.proxy(url-string, mode-as-string-or-number);
 *
 * Key: 1 = "stealth"
 *      0 = "window"
 *      Nothing = return URL as a string
 *
 * Examples:
 * Stealth mode -
 * goProx.ultraviolet("https://google.com", 1);
 * goProx.ultraviolet("https://google.com", "stealth");
 *
 * goProx.searx(1);
 * goProx.searx("stealth");
 *
 * Window mode -
 * goProx.ultraviolet("https://google.com", "window");
 *
 * goProx.searx("window");
 *
 * Return string value mode (default) -
 * goProx.ultraviolet("https://google.com");
 *
 * goProx.searx();
 */
const preparePage = async () => {
  // This won't break the service workers as they store the variable separately.
  uvConfig = self['{{__uv$config}}'];
  sjObject = self['$scramjetLoadController'];
  if (sjObject)
    sjEncode = new (sjObject().ScramjetController)({
      prefix: '{{route}}{{/scram/network/}}',
    }).encodeUrl;

  // Object.freeze prevents goProx from accidentally being edited.
  const goProx = Object.freeze({
    // `location.protocol + "//" + getDomain()` more like `location.origin`
    // setAuthCookie("__cor_auth=1", false);
    ultraviolet: urlHandler(uvUrl),

    scramjet: urlHandler(sjUrl),

    terraria: urlHandler(location.protocol + '//a.' + getDomain()),

    webleste: urlHandler(location.protocol + '//b.' + getDomain()),

    osu: urlHandler(location.origin + '{{route}}{{/archive/osu}}'),

    agar: urlHandler(sjUrl('https://agar.io')),

    tru: urlHandler(sjUrl('https://truffled.lol/g')),

    prison: urlHandler(sjUrl('https://vimlark.itch.io/pick-up-prison')),

    speed: urlHandler(sjUrl('https://captain4lk.itch.io/what-the-road-brings')),

    heli: urlHandler(sjUrl('https://benjames171.itch.io/helo-storm')),

    youtube: urlHandler(uvUrl('https://michael.team/yt/')),

    invidious: urlHandler(sjUrl('https://invidious.snopyta.org')),

    chatgpt: urlHandler(sjUrl('https://chat.openai.com/chat')),

    fmhy: urlHandler(sjUrl('https://fmhy.net')),

    discord: urlHandler(sjUrl('https://discord.com/app')),

    geforcenow: urlHandler(sjUrl('https://play.geforcenow.com/mall')),

    spotify: urlHandler(sjUrl('https://open.spotify.com')),

    tiktok: urlHandler(sjUrl('https://www.tiktok.com')),

    animetsu: urlHandler(sjUrl('https://animetsu.net')),

    twitter: urlHandler(sjUrl('https://twitter.com')),

    twitch: urlHandler(sjUrl('https://www.twitch.tv')),

    instagram: urlHandler(sjUrl('https://www.instagram.com')),

    reddit: urlHandler(sjUrl('https://www.reddit.com')),

    wikipedia: urlHandler(sjUrl('https://www.wikiwand.com')),

  });

  // Call a function after a given number of service workers are active.
  // Workers are appended as additional arguments to the callback.
  const callAfterWorkers = async (
    urls,
    callback,
    afterHowMany = 1,
    tries = 10,
    ...params
  ) => {
    // For 10 tries, stop after 10 seconds of no response from workers.
    if (tries <= 0) return console.log('Failed to recognize service workers.');
    const workers = await Promise.all(
      urls.map((url) => navigator.serviceWorker.getRegistration(url))
    );
    let newUrls = [],
      finishedWorkers = [];
    for (let i = 0; i < workers.length; i++) {
      if (workers[i] && workers[i].active) {
        afterHowMany--;
        finishedWorkers.push(workers[i]);
      } else newUrls.push(urls[i]);
    }
    if (afterHowMany <= 0) return await callback(...params, ...finishedWorkers);
    else
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => {
          setTimeout(() => {
            tries--;
            resolve();
          }, 1000);
        }),
      ]);
    return await callAfterWorkers(
      newUrls,
      callback,
      afterHowMany,
      tries,
      ...params,
      ...finishedWorkers
    );
  };

  // Attach event listeners using goProx to specific app menus that need it.
  const prSet = (id, type) => {
    const formElement = document.getElementById(id);
    if (!formElement) return;

    let prUrl = formElement.querySelector('input[type=text]'),
      prAC = formElement.querySelector('#autocomplete'),
      prGo1 = document.querySelectorAll(`#${id}.pr-go1, #${id} .pr-go1`),
      prGo2 = document.querySelectorAll(`#${id}.pr-go2, #${id} .pr-go2`);

    // Handle the other menu buttons differently if there is no omnibox. Menus
    // which lack an omnibox likely use buttons as mere links.
    const goProxMethod = prUrl
        ? (mode) => () => {
            goProx[type](prUrl.value, mode);
          }
        : (mode) => () => {
            goProx[type](mode);
          },
      // Ultraviolet and Scramjet are currently incompatible with window mode.
      defaultModes = {
        globalDefault: 'window',
        ultraviolet: 'stealth',
        scramjet: 'stealth',
      },
      searchMode = defaultModes[type] || defaultModes['globalDefault'];

    if (prUrl) {
      let enableSearch = false,
        onCooldown = false;

      prUrl.addEventListener('keydown', async (e) => {
        if (e.code === 'Enter') goProxMethod(searchMode)();
        // This is exclusively used for the validator script.
        else if (e.code === 'Validator Test') {
          e.target.value = await goProx[type](e.target.value);
          e.target.dispatchEvent(new Event('change'));
        }
      });

      if (prAC) {
        // Set up a message channel to communicate with Scramjet, if it exists.
        let autocompleteChannel = {},
          sjLoaded = false;
        if (sjObject) {
          autocompleteChannel = new MessageChannel();
          callAfterWorkers(['{{route}}{{/scram/scramjet.sw.js}}'], (worker) => {
            worker.active.postMessage({ type: 'requestAC' }, [
              autocompleteChannel.port2,
            ]);
            sjLoaded = true;
          });

          // Update the autocomplete results if Scramjet has processed them.
          autocompleteChannel.port1.addEventListener('message', ({ data }) => {
            updateAC(
              prAC,
              responseHandlers[data.searchType](data.responseJSON),
              Date.parse(data.time)
            );
            sjLoaded = true;
          });

          autocompleteChannel.port1.start();
        }

        // Get autocomplete search results when typing in the omnibox.
        prUrl.addEventListener('input', async (e) => {
          // Prevent excessive fetch requests by restricting when requests are made.
          if (enableSearch && !onCooldown) {
            if (!e.target.value) {
              prAC.textContent = '';
              return;
            }
            const query = e.target.value;
            if (e.isTrusted) {
              onCooldown = true;
              setTimeout(() => {
                onCooldown = false;
                // Refresh the autocomplete results after the cooldown ends.
                if (query !== e.target.value)
                  e.target.dispatchEvent(new Event('input'));
              }, 600);
            }

            // Get autocomplete results from the selected search engine.
            let searchType = readStorage('SearchEngine');
            if (!(searchType in autocompletes)) searchType = defaultSearch;
            const requestTime = new Date().toUTCString();
            sjLoaded = false;
            requestAC('https://' + autocompletes[searchType], query, sjUrl, {
              searchType: searchType,
              port: autocompleteChannel.port1,
              time: requestTime,
            });
          }
        });

        // Show autocomplete results only if the omnibox is in focus.
        prUrl.addEventListener('focus', () => {
          // Don't show results if they were disabled by the user.
          if (readStorage('UseAC') !== false) {
            enableSearch = true;
            prAC.classList.toggle('display-off', false);
          }
          prUrl.select();
        });
        prUrl.addEventListener('blur', (e) => {
          enableSearch = false;

          // Do not remove the autocomplete result list if it was being clicked.
          if (e.relatedTarget) {
            e.relatedTarget.focus();
            if (document.activeElement.parentNode === prAC) return;
          }

          prAC.classList.toggle('display-off', true);
        });

        // Make the corresponding search query if a given suggestion was clicked.
        prAC.addEventListener('click', (e) => {
          e.target.focus();
          prUrl.value = document.activeElement.textContent;
          goProxMethod(searchMode)();
        });
      }
    }

    prGo1.forEach((element) => {
      element.addEventListener('click', goProxMethod('window'));
    });
    prGo2.forEach((element) => {
      element.addEventListener('click', goProxMethod('stealth'));
    });
  };

  prSet('pr-uv', 'ultraviolet');
  prSet('pr-sj', 'scramjet');
  prSet('pr-yt', 'youtube');
  prSet('pr-iv', 'invidious');
  prSet('pr-trl', 'tru');
  prSet('pr-cg', 'chatgpt');
  prSet('pr-fm', 'fmhy');
  prSet('pr-dc', 'discord');
  prSet('pr-gf', 'geforcenow');
  prSet('pr-sp', 'spotify');
  prSet('pr-tt', 'tiktok');
  prSet('pr-ha', 'animetsu');
  prSet('pr-tw', 'twitter');
  prSet('pr-tc', 'twitch');
  prSet('pr-ig', 'instagram');
  prSet('pr-rt', 'reddit');
  prSet('pr-wa', 'wikipedia');

  // Load the frame for stealth mode if it exists.
  const windowFrame = document.getElementById('frame'),
    loadFrame = () => {
      windowFrame.src = localStorage.getItem('{{hu-lts}}-frame-url');
      return true;
    };
  if (windowFrame) {
    if (uvConfig && sjObject)
      (await callAfterWorkers(
        [
          '{{route}}{{/scram/scramjet.sw.js}}',
          '{{route}}{{/uv/sw.js}}',
          '{{route}}{{/uv/sw-blacklist.js}}',
        ],
        loadFrame,
        2,
        3
      )) || loadFrame();
    else loadFrame();
  }

  const useModule = (moduleFunc, tries = 0) => {
    try {
      moduleFunc();
    } catch (e) {
      if (tries <= 5)
        setTimeout(() => {
          useModule(moduleFunc, tries + 1);
        }, 600);
    }
  };

  if (document.getElementsByClassName('tippy-button').length >= 0)
    useModule(() => {
      tippy('.tippy-button', {
        delay: 50,
        animateFill: true,
        placement: 'bottom',
      });
    });
  if (document.getElementsByClassName('pr-tippy').length >= 0)
    useModule(() => {
      tippy('.pr-tippy', {
        delay: 50,
        animateFill: true,
        placement: 'bottom',
      });
    });

  const banner = document.getElementById('banner');
  if (banner) {
    useModule(() => {
      AOS.init();
    });

    fetch('{{route}}{{/assets/json/splash.json}}', {
      mode: 'same-origin',
    }).then((response) => {
      response.json().then((splashList) => {
        banner.firstElementChild.innerHTML =
          splashList[(Math.random() * splashList.length) | 0];
      });
    });
  }

  // Load in relevant JSON files used to organize large sets of data.
  // This first one is for links, whereas the rest are for navigation menus.
  fetch('{{route}}{{/assets/json/links.json}}', {
    mode: 'same-origin',
  }).then((response) => {
    response.json().then((huLinks) => {
      for (let items = Object.entries(huLinks), i = 0; i < items.length; i++)
        // Replace all placeholder links with the corresponding entry in huLinks.
        (document.getElementById(items[i][0]) || {}).href = items[i][1];
    });
  });

  const navLists = {
    // Pair an element ID with a JSON file name. They are identical for now.
    'emu-nav': 'emu-nav',
    'emulib-nav': 'emulib-nav',
    'flash-nav': 'flash-nav',
    'h5-nav': 'h5-nav',
    'par-nav': 'par-nav',
  };

  for (const [listId, filename] of Object.entries(navLists)) {
    let navList = document.getElementById(listId);

    if (navList) {
      // List items stored in JSON format will be returned as a JS object.
      const data = await fetch(`{{route}}{{/assets/json/}}${filename}.json`, {
        mode: 'same-origin',
      }).then((response) => response.json());

      // Load the JSON lists into specific HTML parent elements as groups of
      // child elements, if the parent element is found.
      switch (filename) {
        case 'emu-nav':
        case 'emulib-nav':
        case 'par-nav':
        case 'h5-nav': {
          const dirnames = {
              // Set the directory of where each item of the corresponding JSON
              // list will be retrieved from.
              'emu-nav': 'emu',
              'emulib-nav': 'emulib',
              'par-nav': 'par',
              'h5-nav': 'h5g',
            },
            dir = dirnames[filename],
            // Add a little functionality for each list item when clicked on.
            clickHandler = (parser, a) => (e) => {
              if (e.target == a || e.target.tagName != 'A') {
                e.preventDefault();
                parser();
              }
            };

          for (let i = 0; i < data.length; i++) {
            // Load each item as an anchor tag with an image, heading,
            // and click event listener.
            const item = data[i],
              a = document.createElement('a'),
              img = document.createElement('img'),
              title = document.createElement('h3');
            ((desc = document.createElement('p')),
              (credits = document.createElement('p')));

            a.href = '#';
            img.src = `{{route}}{{/assets/img/}}${dir}/` + item.img;
            title.textContent = item.name;
            desc.textContent = item.description;
            credits.textContent = item.credits;

            if (filename === 'par-nav') {
              if (item.credits === 'truf')
                desc.innerHTML +=
                  '<br>{{mask}}{{Credits: Check out the full site at }}<a target="_blank" href="{{route}}{{/truffled}}">{{mask}}{{truffled.lol}}</a> //{{mask}}{{ discord.gg/vVqY36mzvj}}';
            }

            a.appendChild(img);
            a.appendChild(title);
            a.appendChild(desc);

            // Which function is used for the click event is determined by
            // the corresponding location/index in the dirnames object.
            const functionsList = [
              // emu-nav
              () => goFrame(item.path),
              // emulib-nav
              () =>
                goFrame(
                  '{{route}}{{/webretro}}?core=' +
                    item.core +
                    '&rom=' +
                    item.rom
                ),
              // par-nav
              item.custom && goProx[item.custom]
                ? () => goProx[item.custom]('stealth')
                : () => {},
              // h5-nav
              item.custom && goProx[item.custom]
                ? () => goProx[item.custom]('window')
                : () => goFrame('{{route}}{{/archive/g/}}' + item.path),
            ];

            a.addEventListener(
              'click',
              clickHandler(
                functionsList[Object.values(dirnames).indexOf(dir)],
                a
              )
            );

            navList.appendChild(a);
          }
          break;
        }

        case 'flash-nav':
          for (let i = 0; i < data.length; i++) {
            // Load each item as an anchor tag with a short title and click
            // event listener.
            const item = data[i],
              a = document.createElement('a');
            a.href = '#';
            a.textContent = item.slice(0, -4);

            a.addEventListener('click', (e) => {
              e.preventDefault();
              goFrame('{{route}}{{/flash}}?swf=' + item);
            });

            navList.appendChild(a);
          }
          break;

        // No default case.
        }
      }
    }

    const isTopLevel = window.self === window.top;
    if (isTopLevel) {
      const launchType = readStorage('LaunchType');
      let newWindow = null;

      if (launchType === 'blank') {
        newWindow = openBlankCloak();
      } else if (launchType === 'blob') {
        newWindow = openBlobCloak();
      }

      if (newWindow) {
        window.location.replace('about:blank');
        setTimeout(() => {
          window.close();
        }, 100);
    }
  }
};
if ('loading' === document.readyState)
  addEventListener('DOMContentLoaded', preparePage);
else preparePage();
})();
