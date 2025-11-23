const https = require('https');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('Parse Error:', data);
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function check(domain) {
    console.log(`\nChecking ${domain}...`);
    
    // 1. 直接查
    try {
        console.log('1. Direct check...');
        const certs = await fetchUrl(`https://crt.sh/?q=${domain}&output=json`);
        console.log(`   Found ${certs.length} records.`);
        if (certs.length > 0) {
            const latest = certs.sort((a, b) => new Date(b.not_after) - new Date(a.not_after))[0];
            console.log(`   Latest expiry: ${latest.not_after}`);
            return;
        }
    } catch (e) { console.error('   Direct check failed:', e.message); }

    // 2. 查根域名
    const parts = domain.split('.');
    if (parts.length > 2) {
        const rootDomain = parts.slice(parts.length - 2).join('.');
        console.log(`2. Checking root: ${rootDomain}...`);
        try {
            const certs = await fetchUrl(`https://crt.sh/?q=${rootDomain}&output=json`);
            console.log(`   Found ${certs.length} records.`);
             if (certs.length > 0) {
                const latest = certs.sort((a, b) => new Date(b.not_after) - new Date(a.not_after))[0];
                console.log(`   Latest expiry: ${latest.not_after}`);
                // 检查是否包含泛域名
                const wildcards = certs.filter(c => c.common_name.startsWith('*.'));
                console.log(`   Found ${wildcards.length} wildcard certs.`);
                if (wildcards.length > 0) {
                    console.log('   Wildcard match found!');
                }
                return;
            }
        } catch (e) { console.error('   Root check failed:', e.message); }

         // 3. 查 %.root
        console.log(`3. Checking wildcard: %.${rootDomain}...`);
        try {
             const certs = await fetchUrl(`https://crt.sh/?q=%.${rootDomain}&output=json`);
             console.log(`   Found ${certs.length} records.`);
             if (certs.length > 0) {
                const latest = certs.sort((a, b) => new Date(b.not_after) - new Date(a.not_after))[0];
                console.log(`   Latest expiry: ${latest.not_after}`);
             }
        } catch (e) { console.error('   Wildcard check failed:', e.message); }
    }
}

check('mv.nianshu2022.cn');

