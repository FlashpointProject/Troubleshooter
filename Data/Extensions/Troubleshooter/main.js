const flashpoint = require('flashpoint-launcher');
const fs = require('fs');
const path = require('path');
const http = require('http');

const fpPath = flashpoint.config.flashpointPath;

const WEIRD_ROUTER_PHP = `
    router.php doesn't contain <?php
    Please check if an anti-virus may be interfering
`;

const ERROR_ROUTER_PHP = `
    Unable to confirm router.php contents
    Please check if an anti-virus may be interfering
`;

const DRI0M_URL = "http://infinity.unstable.life/Flashpoint/Legacy/htdocs/autoupdate-revision.unity3d.com/revisions.plist";

const DRI0M_TEST_STRING = `<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">`;

const ERROR_DRI0M = `
    Unable to connect to Flashpoint Infinity's servers.
    Are you connected to the Internet?
`;

const WEIRD_DRI0M = `
    Found an unexpected response while taking to Flashpoint Infinity's servers.
    Filtering software from your router or ISP may be interfering.
`;

const KNOWN_BAD_STRINGS_AND_RESPONSES = [
    ["SHP Redirector", `
        McAfee software on your router may be blocking access to Flashpoint's servers
        See https://service.mcafee.com/webcenter/portal/cp/home/articleview?locale=en_US&articleId=TS102694 for advice on how to disable
        Or delete the line beginning with "Dri0m" from Legacy/router_base_urls.txt
    `]
];

let INITED_resolve;
let INITED = new Promise((resolve, reject) => {
    INITED_resolve = resolve;
});

function messageBox(message) {
    INITED.then(() => {
        flashpoint.log.info(`Showing error: ${message}`);
        flashpoint.dialogs.showMessageBox({message: message, type: "error"}).catch(e => flashpoint.log.error(`Error showing message box: ${e}`));
    });
}

async function activate(context) {
    flashpoint.onDidConnect(INITED_resolve);
    checkRouterPHP().catch(e => flashpoint.log.error(e));
    checkInfinityServer().catch(e => flashpoint.log.error(e));
}

async function checkRouterPHP() {
    try {
        let routerPHP = await fs.promises.readFile(path.join(fpPath, "Legacy", "router.php"));
        if(routerPHP.indexOf('<?php') === -1) {
            messageBox(WEIRD_ROUTER_PHP);
        }
    } catch(e) {
        flashpoint.log.error(`Error checking for router.php: ${e}`);
        messageBox(ERROR_ROUTER_PHP);
    }
}

function getAll(url) {
    return new Promise((resolve, reject) => {
        let req = http.get(url, (res) => {
            if(res.statusCode !== 200) {
                reject(`HTTP failure: ${res.statusCode}`);
            } else {
                res.setEncoding('utf8');
                let data = '';
                res.on('data', (chunk) => {data += chunk});
                res.on('end', () => {resolve(data);});
                res.on()
            }
        });
        req.on('error', (e) => reject(`ERROR getting DRi0m test url: ${e}`));
    });
}

async function checkInfinityServer() {
    let version = await fs.promises.readFile(path.join(fpPath, "version.txt"));
    if(version.indexOf("Infinity") === -1) return;
    try {
        let test = await getAll(DRI0M_URL);
        if(test.indexOf(DRI0M_TEST_STRING) === -1) {
            let responded = false;
            for(let str_response of KNOWN_BAD_STRINGS_AND_RESPONSES) {
                let str = str_response[0];
                let response = str_response[1];
                if(test.indexOf(str) !== -1) {
                    messageBox(response);
                    responded = true;
                    break;
                }
            }
            if(!responded) {
                messageBox(WEIRD_DRI0M);
            }
        }
    } catch(e) {
        flashpoint.log.error(`Unable to reach Dri0m server: ${e}`);
        messageBox(ERROR_DRI0M);
    }
}

exports.activate = activate;