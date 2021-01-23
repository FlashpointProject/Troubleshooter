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
    Do you want to switch to the backup server?
`;

let INITED_resolve;
let INITED = new Promise((resolve, reject) => {
    INITED_resolve = resolve;
});

async function messageBox(options) {
    await INITED;
    flashpoint.log.info(`Showing error: ${options.message}`);
    if(!options.type) options.type = "error";
    let info_button = options.info?.button ?? "no info button"; // I'm unsure if showMessageBox ever returns null
    let noninfo = false
    let result;
    do {
        result = await flashpoint.dialogs.showMessageBox(options);
        if(result === info_button) {
            // TODO: URL
        } else {
            noninfo = true;
        }
    } while(!noninfo)
    return result;
}

async function activate(context) {
    flashpoint.onDidConnect(INITED_resolve);
    checkRouterPHP().catch(e => flashpoint.log.error(e));
    checkInfinityServer().catch(e => flashpoint.log.error(e));
}

async function checkRouterPHP() {
    try {
        let routerPHP = await fs.promises.readFile(path.join(fpPath, "Legacy", "router.php"), "utf8");
        if(routerPHP.indexOf('<?php') === -1) {
            await messageBox({message: WEIRD_ROUTER_PHP});
        }
    } catch(e) {
        flashpoint.log.error(`Error checking for router.php: ${e}`);
        await messageBox({message: ERROR_ROUTER_PHP});
    }
}

function getAll(url) {
    return new Promise((resolve, reject) => {
        let req = http.get(url, (res) => {
            res.setEncoding('utf8');
            let data = '';
            res.on('data', (chunk) => {data += chunk});
            res.on('end', () => {resolve(data);});
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
            let choice = await messageBox({message: WEIRD_DRI0M, buttons: ["Yes", "No", "More Information"], info: {button: 2, link: "https://bluemaxima.org/flashpoint/datahub/Extended_FAQ#WhiteScreenAndNoImages"}});
            if(choice === 0) {
                let router_base_urls = await fs.promises.readFile(path.join(fpPath, "Legacy", "router_base_urls.txt"), "utf8");
                let new_router_base_urls = router_base_urls.replace(/Dri0m.*/, "");
                await fs.promises.writeFile(path.join(fpPath, "Legacy", "router_base_urls.txt"), new_router_base_urls);
            }
        }
    } catch(e) {
        flashpoint.log.error(`Unable to reach Dri0m server: ${e}`);
        await messageBox({message: ERROR_DRI0M});
    }
}

exports.activate = activate;