class Life360 {
  static urlencode(obj) {
    let result = '';
    for (const key in obj) {
      if (result !== '') result += '&';
      let value = obj[key];
      result += encodeURIComponent(key) + '=' + encodeURIComponent(value);
    }
    return result;
  }
  constructor() {
    this.defaults = {
      url: 'https://www.life360.com/v3',
      method: 'GET',
      bodyType: 'urlencoded',
      auth: 'Basic U3dlcUFOQWdFVkVoVWt1cGVjcmVrYXN0ZXFhVGVXckFTV2E1dXN3MzpXMnZBV3JlY2hhUHJlZGFoVVJhZ1VYYWZyQW5hbWVqdQ=='
    };
  }
  async _request(options) {
    let url = this.defaults.url;
    let method = this.defaults.method;
    let bodyType = this.defaults.bodyType;
    let auth = this.defaults.auth;
    let headers = {};

    if (options.url) url = options.url;
    if (options.method) method = options.method.toUpperCase();
    if (options.bodyType) bodyType = options.bodyType;
    if (options.auth) auth = options.auth;

    if (options.path) url += options.path;

    let bodyText = undefined;

    if (options.body) {
      let body = options.body;
      if (method === 'GET') {
        if (typeof body === 'string') {
          url += '?' + body;
        } else if (typeof body === 'object') {
          url += '?' + Life360.urlencode(body)
        }
      } else {
        if (bodyType === 'urlencoded') {
          headers['content-type'] = 'application/x-www-form-urlencoded';
          bodyText = Life360.urlencode(body);
        } else {
          bodyText = JSON.stringify(body);
        }
      }
    }

    const resp = await fetch(url, {
      headers: {
        accept: 'application/json',
        'accept-language': 'en-US,en;q=0.9',
        authorization: auth,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: bodyText,
      method
    });
    const respBody = await resp.text();
    const json = JSON.parse(respBody);
    if (json.errorMessage) {
      throw new Error(json.errorMessage);
    }
    return json;
  }
  async login(creds) {
    const resp = await this._request({
      path: '/oauth2/token.json',
      method: 'post',
      body: {
        countryCode: 1,
        password: creds.password,
        username: creds.email,
        grant_type: 'password'
      }
    });
    this.session = resp;
    localStorage.session = JSON.stringify(resp);

    return resp;
  }
  async me() {
    const session = this.session;
    const resp = await this._request({
      path: '/users/me',
      auth: `${session.token_type} ${session.access_token}`
    });
    this.me = resp;
    localStorage.me = JSON.stringify(resp);

    return resp;
  }
  async getCircles() {
    const session = this.session;
    const resp = await this._request({
      path: '/circles',
      auth: `${session.token_type} ${session.access_token}`
    });
    this.circles = resp.circles;
    localStorage.circles = JSON.stringify(resp.circles);

    return resp.circles;
  }
  async circle(id) {
    if (typeof id === 'object') id = id.id;

    const session = this.session;
    const resp = await this._request({
      path: '/circles/' + id,
      auth: `${session.token_type} ${session.access_token}`
    });
    if (!this.circles) this.circles = [];
    let circleMatched = false;
    for (let i = 0; i < this.circles.length; i++) {
      if (this.circles[i].id === id) {
        this.circles[i] = resp;
        circleMatched = true;
      }
    }
    if (!circleMatched) {
      this.circles.push(resp);
    }
    localStorage.circles = JSON.stringify(this.circles);

    return resp;
  }
}

HTMLElement.prototype.setText = function(text) {
  if (this.innerText !== text) this.innerText = text;
};

function changeTemplate(root, cls, onLoad) {
  const template = document.querySelector('template.' + cls);
  root.innerHTML = template.innerHTML;
  root.className = template.className;
  if (onLoad) onLoad(root);
}

function addTemplate(root, cls, onLoad) {
  const template = document.querySelector('template.' + cls);
  const container = document.createElement('div');
  container.innerHTML = template.innerHTML;
  container.className = template.className;
  root.appendChild(container);
  if (onLoad) onLoad(root);
  return container;
}

function addMessage(root, text, severity) {
  const messagesUi = root.querySelector('.messages');

  const messageUi = document.createElement('div');
  messagesUi.appendChild(messageUi);
  messageUi.classList.add('msg-' + severity);
  messageUi.innerText = text;
  return messageUi;
}

// focus next element on Enter key
document.addEventListener('keydown', function(e) {
  const target = e.target;
  if (!target) return;
  if (e.key !== 'Enter') return;

  let findNextFocus = false;

  if (target instanceof HTMLInputElement) {
    if (target.type === 'text' || target.type === 'password' || target.type === 'email') {
      findNextFocus = true;
    }
  }

  if (findNextFocus) {
    const allFormElements = document.querySelectorAll('select,input,button');
    for (let i = 0; i < allFormElements.length; i++) {
      if (allFormElements[i] === target && i !== allFormElements.length) {
        const nextElement = allFormElements[i + 1];
        console.log(nextElement);
        if (nextElement instanceof HTMLInputElement) {
          nextElement.focus();
        } else if (nextElement instanceof HTMLButtonElement) {
          nextElement.click();
        }
      }
    }
  }
});

document.addEventListener('click', async function(e) {
  if (!e.target) return;
  if (e.target.id === 'logout-btn') {
    life360.session = undefined;
    localStorage.removeItem('session');
    changeTemplate(page, 'login', onLoginLoad);
  }
});

document.addEventListener('DOMContentLoaded', function() {
  window.life360 = new Life360();
  window.page = document.getElementById('page');
  if (localStorage.circles) {
    life360.circles = JSON.parse(localStorage.circles);
  }
  if (localStorage.session) {
    life360.session = JSON.parse(localStorage.session);
    console.log('dom content loaded, load dashboard');
    changeTemplate(page, 'dashboard', dashboard.onLoad);
  } else {
    changeTemplate(page, 'login', onLoginLoad);
  }
}, false);

async function onLoginLoad(ui) {
  ui.querySelector('input[name=email]').addEventListener('keyup', function(e) {
    const value = e.target.value.trim();
    if (value.length === 0) return;
    localStorage.savedemail = value;
  });
  ui.querySelector('button#login-btn').addEventListener('click', async function() {
    let email = ui.querySelector('#page input[name=email]').value.trim();
    let password = ui.querySelector('#page input[name=password]').value.trim();
    if (email === '') {
      addMessage(ui, 'Email can not be empty!', 'error');
      return;
    }
    if (password === '') {
      addMessage(ui, 'Password can not be empty!', 'error');
      return;
    }
    try {
      const session = await window.life360.login({
        email,
        password
      });
      localStorage.savedemail = email;
      localStorage.session = JSON.stringify(session);
      changeTemplate(page, 'dashboard', dashboard.onLoad);
    } catch (err) {
      console.error(err);
      addMessage(ui, err.message, 'error');
    }
  });
  if (localStorage.savedemail) {
    ui.querySelector('input[name=email]').value = localStorage.savedemail;
  }

  // Attempt to fetch session token from existing login.
  try {
    const grabbedSession = await grabExistingSessionFromLife360()
    if (grabbedSession) {
      localStorage.session = JSON.stringify(grabbedSession)
      window.life360.session = grabbedSession
      changeTemplate(page, 'dashboard', dashboard.onLoad)
    }

  } catch (err) {
    console.log(err)
    // Log exceptions
  }
}

async function grabExistingSessionFromLife360() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (tab) {
    const scriptResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function() {
        return localStorage.auth;
      }
    })
    const responseString = scriptResult[0].result
    if (responseString) {
      const responseJson = JSON.parse(responseString)
      if (responseJson && responseJson.user && responseJson.accessToken) {
        const name = responseJson.user.firstName
        const accessToken = responseJson.accessToken
        return {
          access_token: accessToken,
          token_type: 'Bearer',
          user: responseJson.user
        }
      }
    }
  }
}

let dashboard = {};
dashboard.onLoad = async function(ui) {
  const user = life360.session.user;

  ui.querySelector('button#logout-btn').addEventListener('click', async function() {
    life360.session = undefined;
    localStorage.removeItem('session');
    changeTemplate(page, 'login', onLoginLoad);
  });
  window.page.querySelector('.username').innerText = user.firstName + ' ' + user.lastName;

  //const me = await window.life360.me();
  await refreshDashboard();

};
dashboard.displayCircle = function(circle) {
  let circleUi = window.page.querySelector(`div[data-circleid="${circle.id}"]`);

  if (!circleUi) {
    circleUi = addTemplate(window.page.querySelector('#circles'), 'dashboard-circle');
    circleUi.setAttribute('data-circleid', circle.id);
    circleUi.querySelector('.circle-name').innerText = circle.name;
  }

  if (circle.members) {
    for (const member of circle.members) {
      dashboard.displayMember(member, circleUi);
    }
  }
};
dashboard.displayMember = function(member, circleUi) {
  const circleMembersUi = circleUi.querySelector('.circle-members');

  let memberUi = circleMembersUi.querySelector(`div[data-id="${member.id}"]`);
  if (!memberUi) {
    memberUi = addTemplate(circleMembersUi, 'dashboard-circle-member');
    memberUi.setAttribute('data-id', member.id);
    memberUi.querySelector('.member-name').innerText =
      member.firstName + ' ' + member.lastName;
  }

  const batteryTextUi = memberUi.querySelector('.member-battery-text');
  const batteryIconUi = memberUi.querySelector('.battery-icon');
  const locationUi = memberUi.querySelector('.member-location');
  const latlonUi = memberUi.querySelector('.member-latlon');
  const lastUpdateTimeUi = memberUi.querySelector('.member-lastupdatetime');
  const issueUi = memberUi.querySelector('.member-issue');

  const location = member.location;
  if (location) {
    if (location.battery) {
      const battery = location.battery;
      const batteryClass = 'battery-level-' + Math.floor(battery / 10);
      batteryTextUi.setText(battery);
      batteryIconUi.className = 'battery-icon ' + batteryClass;
    }
    locationUi.setText(location.address1 + '\n' + location.address2);
    latlonUi.setText(location.latitude + ', ' + location.longitude);
    latlonUi.onclick = function() {
      window.open(`https://www.google.com/maps/place/${location.latitude},${location.longitude}`)
    };
    const timestamp = new Date(parseInt(location.timestamp) * 1000);
    const timeString = timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString();
    lastUpdateTimeUi.setText(timeString);
  }
  if (member.issues && member.issues.disconnected === "1") {
    const issueText = "This person has lost connection."
    issueUi.setText(issueText)
  }
};

async function refreshDashboard() {
  console.log('refresh dashboard');
  let circles = life360.circles;
  if (!circles) {
    circles = await window.life360.getCircles();
  }
  let promises = [];
  for (let circle of circles) {
    dashboard.displayCircle(circle);
    promises.push(window.life360.circle(circle.id).then(circle => {
      dashboard.displayCircle(circle);
    }));
  }
  await Promise.all(promises);
  setTimeout(refreshDashboard, 5000);
}
