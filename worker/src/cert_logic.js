    // 1. 尝试获取证书信息 (通过 crt.sh 公开 API)
    // 注意：crt.sh 有时候会慢或限流，作为辅助手段
    let certExpiry = null;
    try {
      const headers = { 
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      };

      const fetchCerts = async (searchDomain) => {
          try {
              const res = await fetch(`https://crt.sh/?q=${searchDomain}&output=json`, { headers });
              if (!res.ok) return [];
              const text = await res.text();
              try {
                  return JSON.parse(text);
              } catch {
                  return [];
              }
          } catch {
              return [];
          }
      };

      let certs = await fetchCerts(domain);
      
      // 如果没查到，且域名看起来像子域名，尝试查主域名
      if ((!certs || certs.length === 0) && domain.split('.').length > 2) {
         const parts = domain.split('.');
         const rootDomain = parts.slice(parts.length - 2).join('.');
         
         // 查主域名
         const rootCerts = await fetchCerts(rootDomain);
         if (rootCerts.length > 0) certs = certs.concat(rootCerts);
         
         // 查显式泛域名
         const wildCerts = await fetchCerts(`%.${rootDomain}`);
         if (wildCerts.length > 0) certs = certs.concat(wildCerts);
      }

      if (certs && certs.length > 0) {
        // 找到最新的一个证书
        const latestCert = certs.sort((a, b) => new Date(b.not_after).getTime() - new Date(a.not_after).getTime())[0];
        certExpiry = latestCert.not_after;
      }
    } catch (e) {
      console.warn('Failed to fetch cert info:', e);
    }

