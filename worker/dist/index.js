var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  text() {
    return this.#cachedBody("text");
  }
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  blob() {
    return this.#cachedBody("blob");
  }
  formData() {
    return this.#cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  env = {};
  #var;
  finalized = false;
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class {
  static {
    __name(this, "Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }, "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class {
  static {
    __name(this, "Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class {
  static {
    __name(this, "Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// src/index.ts
var app = new Hono2();
app.use("/*", cors());
var PROTECTED_ROUTES = ["/monitors", "/notification-channels", "/incidents", "/settings", "/test-alert"];
app.use("/*", async (c, next) => {
  if (c.req.method === "OPTIONS") return await next();
  if (c.req.path === "/monitors/public") return await next();
  if (c.req.path === "/incidents" && c.req.method === "GET") return await next();
  if (c.req.path === "/settings" && c.req.method === "GET") return await next();
  const needsAuth = PROTECTED_ROUTES.some((r) => c.req.path.startsWith(r));
  if (!needsAuth) return await next();
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Unauthorized" }, 401);
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const apiKey = c.env.ADMIN_API_KEY;
  const adminPassword = c.env.ADMIN_PASSWORD;
  if (apiKey && token === apiKey) return await next();
  if (!apiKey && adminPassword && token === adminPassword) return await next();
  if (!apiKey && !adminPassword) {
    console.warn("Neither ADMIN_API_KEY nor ADMIN_PASSWORD is set. All admin routes are unprotected!");
    return await next();
  }
  return c.json({ error: "Unauthorized: Invalid credentials" }, 401);
});
app.get("/monitors", async (c) => {
  try {
    const { results } = await c.env.DB.prepare("SELECT * FROM monitors ORDER BY created_at ASC").all();
    return c.json(results);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.get("/monitors/public", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT id, name, url, status, last_check, cert_expiry, domain_expiry, paused, tags FROM monitors ORDER BY created_at ASC"
    ).all();
    return c.json(results);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.post("/monitors", async (c) => {
  try {
    const body = await c.req.json();
    const { name, url, interval, keyword, user_agent, tags, request_headers, request_body } = body;
    if (!name || !url) {
      return c.json({ error: "Missing name or url" }, 400);
    }
    const method = (body.method || "GET").toUpperCase();
    const result = await c.env.DB.prepare(
      `INSERT INTO monitors (name, url, method, interval, keyword, user_agent, tags, request_headers, request_body)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      name,
      url,
      method,
      interval || 300,
      keyword || null,
      user_agent || null,
      tags || null,
      request_headers || null,
      request_body || null
    ).run();
    const newId = result.meta.last_row_id;
    c.executionCtx.waitUntil(
      (async () => {
        try {
          await c.env.DB.prepare("UPDATE monitors SET check_info_status = ? WHERE id = ?").bind((/* @__PURE__ */ new Date()).toISOString(), newId).run();
          const { results } = await c.env.DB.prepare("SELECT * FROM monitors WHERE id = ?").bind(newId).all();
          if (results[0]) await updateDomainCertInfo(c.env, results[0]);
        } catch (err) {
          console.error("Initial cert check failed:", err);
        }
      })()
    );
    return c.json({ success: true, id: newId }, 201);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.delete("/monitors/:id", async (c) => {
  const id = c.req.param("id");
  try {
    await c.env.DB.prepare("DELETE FROM logs WHERE monitor_id = ?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM monitors WHERE id = ?").bind(id).run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.patch("/monitors/:id/config", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = [];
    const values = [];
    const strFields = [
      ["name", "name"],
      ["url", "url"],
      ["keyword", "keyword"],
      ["user_agent", "user_agent"],
      ["tags", "tags"],
      ["request_headers", "request_headers"],
      ["request_body", "request_body"]
    ];
    for (const [key, col] of strFields) {
      if (body[key] !== void 0) {
        if (key === "name" || key === "url") {
          if (typeof body[key] === "string" && body[key].trim()) {
            fields.push(`${col} = ?`);
            values.push(body[key].trim());
          }
        } else {
          fields.push(`${col} = ?`);
          values.push(body[key] || null);
        }
      }
    }
    if (body.interval !== void 0) {
      const iv = Number(body.interval);
      if (!isNaN(iv) && iv >= 60) {
        fields.push("interval = ?");
        values.push(iv);
      }
    }
    if (body.method !== void 0) {
      fields.push("method = ?");
      values.push(String(body.method).toUpperCase());
    }
    const flagFields = ["check_ssl", "check_domain"];
    for (const k of flagFields) {
      if (body[k] !== void 0) {
        fields.push(`${k} = ?`);
        values.push(body[k] ? 1 : 0);
      }
    }
    const numFields = ["alert_silence_uptime", "alert_silence_ssl", "alert_silence_domain", "alert_error_rate"];
    for (const k of numFields) {
      if (body[k] !== void 0) {
        const h = Number(body[k]);
        if (!isNaN(h) && h >= 0) {
          fields.push(`${k} = ?`);
          values.push(h);
        }
      }
    }
    if (fields.length === 0) return c.json({ error: "No valid fields to update" }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE monitors SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.patch("/monitors/:id/pause", async (c) => {
  const id = c.req.param("id");
  try {
    const { results } = await c.env.DB.prepare("SELECT paused, status FROM monitors WHERE id = ?").bind(id).all();
    if (!results[0]) return c.json({ error: "Monitor not found" }, 404);
    const newPaused = results[0].paused === 1 ? 0 : 1;
    const newStatus = newPaused ? "PAUSED" : "UP";
    await c.env.DB.prepare("UPDATE monitors SET paused = ?, status = ?, retry_count = 0 WHERE id = ?").bind(newPaused, newStatus, id).run();
    return c.json({ success: true, paused: newPaused === 1, status: newStatus });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.get("/monitors/:id/logs", async (c) => {
  const id = c.req.param("id");
  const limit = Math.min(Number(c.req.query("limit") || 50), 200);
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM logs WHERE monitor_id = ? ORDER BY created_at DESC LIMIT ?"
    ).bind(id, limit).all();
    return c.json(results);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.get("/monitors/:id/stats", async (c) => {
  const id = c.req.param("id");
  try {
    const periods = [
      { key: "h24", hours: 24 },
      { key: "d7", hours: 24 * 7 },
      { key: "d30", hours: 24 * 30 }
    ];
    const stats = {};
    for (const { key, hours } of periods) {
      const since = new Date(Date.now() - hours * 36e5).toISOString();
      const row = await c.env.DB.prepare(
        "SELECT COUNT(*) as total, SUM(CASE WHEN is_fail = 0 THEN 1 ELSE 0 END) as success FROM logs WHERE monitor_id = ? AND created_at >= ?"
      ).bind(id, since).first();
      if (row && row.total > 0) {
        stats[key] = (row.success / row.total * 100).toFixed(2);
      } else {
        stats[key] = null;
      }
    }
    return c.json(stats);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.post("/monitors/batch", async (c) => {
  try {
    const body = await c.req.json();
    const { action, ids } = body;
    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: "Missing action or ids" }, 400);
    }
    const placeholders = ids.map(() => "?").join(",");
    switch (action) {
      case "pause":
        await c.env.DB.prepare(`UPDATE monitors SET paused = 1, status = 'PAUSED', retry_count = 0 WHERE id IN (${placeholders})`).bind(...ids).run();
        break;
      case "resume":
        await c.env.DB.prepare(`UPDATE monitors SET paused = 0, status = 'UP', retry_count = 0 WHERE id IN (${placeholders})`).bind(...ids).run();
        break;
      case "delete":
        await c.env.DB.prepare(`DELETE FROM logs WHERE monitor_id IN (${placeholders})`).bind(...ids).run();
        await c.env.DB.prepare(`DELETE FROM monitors WHERE id IN (${placeholders})`).bind(...ids).run();
        break;
      default:
        return c.json({ error: "Invalid action" }, 400);
    }
    return c.json({ success: true, affected: ids.length });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.get("/incidents", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM incidents WHERE status = 'active' ORDER BY created_at DESC"
    ).all();
    return c.json(results || []);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.get("/incidents/all", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM incidents ORDER BY created_at DESC LIMIT 100"
    ).all();
    return c.json(results || []);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.post("/incidents", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.title) return c.json({ error: "Missing title" }, 400);
    const severity = ["info", "warning", "critical"].includes(body.severity || "") ? body.severity : "info";
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await c.env.DB.prepare(
      "INSERT INTO incidents (title, description, severity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(body.title, body.description || null, severity, "active", now, now).run();
    return c.json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.patch("/incidents/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = [];
    const values = [];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (body.title) {
      fields.push("title = ?");
      values.push(body.title);
    }
    if (body.description !== void 0) {
      fields.push("description = ?");
      values.push(body.description || null);
    }
    if (body.severity && ["info", "warning", "critical"].includes(body.severity)) {
      fields.push("severity = ?");
      values.push(body.severity);
    }
    if (body.status === "resolved") {
      fields.push("status = 'resolved'");
      fields.push("resolved_at = ?");
      values.push(now);
    } else if (body.status === "active") {
      fields.push("status = 'active'");
      fields.push("resolved_at = NULL");
    }
    fields.push("updated_at = ?");
    values.push(now);
    if (fields.length <= 1) return c.json({ error: "No valid fields" }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE incidents SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.delete("/incidents/:id", async (c) => {
  const id = c.req.param("id");
  try {
    await c.env.DB.prepare("DELETE FROM incidents WHERE id = ?").bind(id).run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.get("/settings", async (c) => {
  try {
    const { results } = await c.env.DB.prepare("SELECT key, value FROM settings").all();
    const obj = {};
    (results || []).forEach((r) => {
      obj[r.key] = r.value;
    });
    return c.json(obj);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.put("/settings", async (c) => {
  try {
    const body = await c.req.json();
    const allowed = ["site_title", "site_description", "site_logo_url"];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const key of allowed) {
      if (body[key] !== void 0) {
        await c.env.DB.prepare(
          "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
        ).bind(key, body[key], now).run();
      }
    }
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
function maskSecret(val) {
  if (!val || val.length <= 8) return "****";
  return val.slice(0, 4) + "****" + val.slice(-4);
}
__name(maskSecret, "maskSecret");
function maskChannelConfig(channel) {
  try {
    const cfg = JSON.parse(channel.config);
    const masked = {};
    for (const [k, v] of Object.entries(cfg)) {
      if (typeof v === "string" && ["secret", "token", "access_token", "bot_token", "key"].some((s) => k.toLowerCase().includes(s))) {
        masked[k] = maskSecret(v);
      } else {
        masked[k] = v;
      }
    }
    return { ...channel, config: JSON.stringify(masked) };
  } catch {
    return channel;
  }
}
__name(maskChannelConfig, "maskChannelConfig");
app.get("/notification-channels", async (c) => {
  try {
    const { results } = await c.env.DB.prepare("SELECT * FROM notification_channels ORDER BY created_at DESC").all();
    return c.json((results || []).map(maskChannelConfig));
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.post("/notification-channels", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.type || !body.name || !body.config) return c.json({ error: "Missing required fields" }, 400);
    const validTypes = ["dingtalk", "wecom", "feishu", "telegram", "webhook"];
    if (!validTypes.includes(body.type)) return c.json({ error: `Invalid type. Valid: ${validTypes.join(", ")}` }, 400);
    await c.env.DB.prepare("INSERT INTO notification_channels (type, name, enabled, config) VALUES (?, ?, ?, ?)").bind(body.type, body.name, body.enabled ?? 1, JSON.stringify(body.config)).run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.patch("/notification-channels/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const fields = [];
    const values = [];
    if (body.name !== void 0) {
      fields.push("name = ?");
      values.push(body.name);
    }
    if (body.enabled !== void 0) {
      fields.push("enabled = ?");
      values.push(body.enabled);
    }
    if (body.config !== void 0 && Object.keys(body.config).length > 0) {
      const existing = await c.env.DB.prepare("SELECT config FROM notification_channels WHERE id = ?").bind(id).first();
      let mergedConfig = {};
      if (existing?.config) {
        try {
          mergedConfig = JSON.parse(existing.config);
        } catch {
        }
      }
      for (const [k, v] of Object.entries(body.config)) {
        if (v !== "" && v !== null && v !== void 0) mergedConfig[k] = v;
      }
      fields.push("config = ?");
      values.push(JSON.stringify(mergedConfig));
    }
    if (fields.length === 0) return c.json({ error: "No valid fields" }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE notification_channels SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.delete("/notification-channels/:id", async (c) => {
  const id = c.req.param("id");
  try {
    await c.env.DB.prepare("DELETE FROM notification_channels WHERE id = ?").bind(id).run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.post("/notification-channels/:id/test", async (c) => {
  const id = c.req.param("id");
  try {
    const channel = await c.env.DB.prepare("SELECT * FROM notification_channels WHERE id = ?").bind(id).first();
    if (!channel) return c.json({ error: "Channel not found" }, 404);
    const mockMonitor = { name: "Test Monitor", url: "https://example.com" };
    const sent = await sendToChannel(channel, mockMonitor, "DOWN", "\u8FD9\u662F\u4E00\u6761\u6D4B\u8BD5\u6D88\u606F\uFF0C\u7528\u4E8E\u9A8C\u8BC1\u901A\u77E5\u6E20\u9053\u662F\u5426\u914D\u7F6E\u6B63\u786E\u3002");
    return c.json({ success: sent });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
app.post("/test-alert", async (c) => {
  try {
    const mockMonitor = { name: "Test Monitor", url: "https://example.com" };
    const sent = await sendAlertToAllChannels(c.env, mockMonitor, "DOWN", "\u8FD9\u662F\u4E00\u6761\u6D4B\u8BD5\u6D88\u606F\uFF0C\u7528\u4E8E\u9A8C\u8BC1\u901A\u77E5\u6E20\u9053\u914D\u7F6E\u3002");
    return c.json({ success: sent });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
var index_default = {
  fetch: app.fetch,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runScheduledTasks(env));
  }
};
async function runScheduledTasks(env) {
  const hour = (/* @__PURE__ */ new Date()).getUTCHours();
  const tasks = [checkSites(env)];
  if (hour === 2) {
    tasks.push(cleanupLogs(env));
    tasks.push(checkExpiryAlerts(env));
  }
  await Promise.all(tasks);
}
__name(runScheduledTasks, "runScheduledTasks");
async function checkSites(env) {
  console.log("Starting scheduled check...");
  const now = Date.now();
  const { results } = await env.DB.prepare("SELECT * FROM monitors").all();
  const tasks = results.map(async (monitor) => {
    if (monitor.paused === 1) return;
    if (isTimeToCheck(monitor, now)) await performCheck(monitor, env);
  });
  await Promise.all(tasks);
}
__name(checkSites, "checkSites");
function isTimeToCheck(monitor, now) {
  if (monitor.status === "RETRYING") return true;
  const lastCheck = monitor.last_check ? new Date(monitor.last_check).getTime() : 0;
  const intervalMs = (monitor.interval || 300) * 1e3;
  return now - lastCheck >= intervalMs;
}
__name(isTimeToCheck, "isTimeToCheck");
async function performCheck(monitor, env) {
  const startTime = Date.now();
  let status = 200;
  let isFail = false;
  let reason = "";
  try {
    let headers = {
      "User-Agent": monitor.user_agent || "Uptime-Monitor/1.0"
    };
    if (monitor.request_headers) {
      try {
        const customHeaders = JSON.parse(monitor.request_headers);
        headers = { ...headers, ...customHeaders };
      } catch {
      }
    }
    const fetchOptions = {
      method: monitor.method || "GET",
      headers,
      cf: { cacheTtl: 0, cacheEverything: false }
    };
    if (["POST", "PUT", "PATCH"].includes(monitor.method || "GET") && monitor.request_body) {
      fetchOptions.body = monitor.request_body;
      if (!headers["Content-Type"]) {
        fetchOptions.headers["Content-Type"] = "application/json";
      }
    }
    const response = await fetch(monitor.url, fetchOptions);
    status = response.status;
    if (!response.ok) {
      isFail = true;
      reason = `HTTP ${status}`;
    } else {
      const lastInfoCheck = monitor.check_info_status ? new Date(monitor.check_info_status).getTime() : 0;
      if (Date.now() - lastInfoCheck > 864e5) {
        env.DB.prepare("UPDATE monitors SET check_info_status = ? WHERE id = ?").bind((/* @__PURE__ */ new Date()).toISOString(), monitor.id).run().then(() => updateDomainCertInfo(env, monitor)).catch(console.error);
      }
      if (monitor.keyword) {
        const text = await response.text();
        if (!text.includes(monitor.keyword)) {
          isFail = true;
          reason = `Keyword "${monitor.keyword}" not found`;
        }
      }
    }
  } catch (e) {
    isFail = true;
    status = 0;
    const errorMsg = e instanceof Error ? e.message : "Unknown error";
    if (errorMsg.includes("handshake") || errorMsg.includes("certificate") || errorMsg.includes("SSL") || errorMsg.includes("TLS")) {
      reason = `SSL Error: ${errorMsg}`;
    } else if (errorMsg.includes("time") || errorMsg.includes("timeout")) {
      reason = "Timeout";
    } else {
      reason = errorMsg || "Network Error";
    }
  }
  const latency = Date.now() - startTime;
  await env.DB.prepare("INSERT INTO logs (monitor_id, status_code, latency, is_fail, reason) VALUES (?, ?, ?, ?, ?)").bind(monitor.id, status, latency, isFail ? 1 : 0, reason || null).run();
  if (!isFail && monitor.alert_error_rate > 0) {
    await checkErrorRateAlert(env, monitor);
  }
  let newStatus = monitor.status;
  let newRetryCount = monitor.retry_count;
  const silenceHoursUptime = monitor.alert_silence_uptime ?? 24;
  const lastAlertUptimeMs = monitor.last_alert_uptime ? new Date(monitor.last_alert_uptime).getTime() : 0;
  const silenced = silenceHoursUptime > 0 && Date.now() - lastAlertUptimeMs < silenceHoursUptime * 36e5;
  if (isFail) {
    if (monitor.status === "UP") {
      newStatus = "RETRYING";
      newRetryCount = 1;
    } else if (monitor.status === "RETRYING") {
      if (newRetryCount < 3) {
        newRetryCount++;
      } else {
        newStatus = "DOWN";
        if (!silenced) {
          const sent = await sendAlertToAllChannels(env, monitor, "DOWN", `\u9519\u8BEF\u539F\u56E0: ${reason}`);
          if (sent) await env.DB.prepare("UPDATE monitors SET last_alert_uptime = ? WHERE id = ?").bind((/* @__PURE__ */ new Date()).toISOString(), monitor.id).run();
        }
      }
    }
  } else {
    if (monitor.status === "DOWN") {
      const sent = await sendAlertToAllChannels(env, monitor, "UP", `\u54CD\u5E94\u8017\u65F6: ${latency}ms`);
      if (sent) await env.DB.prepare("UPDATE monitors SET last_alert_uptime = ? WHERE id = ?").bind((/* @__PURE__ */ new Date()).toISOString(), monitor.id).run();
    }
    newStatus = "UP";
    newRetryCount = 0;
  }
  await env.DB.prepare("UPDATE monitors SET last_check = ?, status = ?, retry_count = ? WHERE id = ?").bind((/* @__PURE__ */ new Date()).toISOString(), newStatus, newRetryCount, monitor.id).run();
}
__name(performCheck, "performCheck");
async function checkErrorRateAlert(env, monitor) {
  try {
    const since = new Date(Date.now() - 5 * 6e4).toISOString();
    const row = await env.DB.prepare(
      "SELECT COUNT(*) as total, SUM(is_fail) as fails FROM logs WHERE monitor_id = ? AND created_at >= ?"
    ).bind(monitor.id, since).first();
    if (!row || row.total < 3) return;
    const errorRate = Math.round(row.fails / row.total * 100);
    if (errorRate >= monitor.alert_error_rate) {
      const silenceHoursUptime = monitor.alert_silence_uptime ?? 24;
      const lastAlertMs = monitor.last_alert_uptime ? new Date(monitor.last_alert_uptime).getTime() : 0;
      if (silenceHoursUptime > 0 && Date.now() - lastAlertMs < silenceHoursUptime * 36e5) return;
      const sent = await sendAlertToAllChannels(
        env,
        monitor,
        "DOWN",
        `\u26A0 \u9519\u8BEF\u7387\u544A\u8B66\uFF1A\u8FC7\u53BB 5 \u5206\u949F\u5185\u9519\u8BEF\u7387 ${errorRate}%\uFF0C\u8D85\u8FC7\u9608\u503C ${monitor.alert_error_rate}%`
      );
      if (sent) await env.DB.prepare("UPDATE monitors SET last_alert_uptime = ? WHERE id = ?").bind((/* @__PURE__ */ new Date()).toISOString(), monitor.id).run();
    }
  } catch (e) {
    console.error("Error rate check failed:", e);
  }
}
__name(checkErrorRateAlert, "checkErrorRateAlert");
async function cleanupLogs(env) {
  console.log("Starting log cleanup...");
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString();
    const { meta: deletedOld } = await env.DB.prepare("DELETE FROM logs WHERE created_at < ?").bind(thirtyDaysAgo).run();
    console.log(`Deleted ${deletedOld.changes} old logs (>30d).`);
    const { results } = await env.DB.prepare("SELECT id FROM monitors").all();
    for (const monitor of results) {
      await env.DB.prepare(`
        DELETE FROM logs WHERE monitor_id = ? AND id NOT IN (
          SELECT id FROM logs WHERE monitor_id = ? ORDER BY created_at DESC LIMIT 1000
        )
      `).bind(monitor.id, monitor.id).run();
    }
    console.log("Log cleanup completed.");
  } catch (e) {
    console.error("Log cleanup error:", e);
  }
}
__name(cleanupLogs, "cleanupLogs");
async function checkExpiryAlerts(env) {
  console.log("Checking expiry alerts...");
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, url, cert_expiry, domain_expiry,
              check_ssl, check_domain,
              alert_silence_ssl, alert_silence_domain,
              last_alert_ssl, last_alert_domain
       FROM monitors WHERE paused = 0`
    ).all();
    const now = Date.now();
    const tasks = results.map(async (monitor) => {
      const checks = [
        { label: "SSL \u8BC1\u4E66", dateStr: monitor.cert_expiry, enabled: (monitor.check_ssl ?? 1) === 1, silenceHours: monitor.alert_silence_ssl ?? 24, lastAlertAt: monitor.last_alert_ssl, lastAlertField: "last_alert_ssl" },
        { label: "\u57DF\u540D", dateStr: monitor.domain_expiry, enabled: (monitor.check_domain ?? 1) === 1, silenceHours: monitor.alert_silence_domain ?? 24, lastAlertAt: monitor.last_alert_domain, lastAlertField: "last_alert_domain" }
      ];
      for (const check of checks) {
        if (!check.enabled || !check.dateStr) continue;
        const lastMs = check.lastAlertAt ? new Date(check.lastAlertAt).getTime() : 0;
        if (check.silenceHours > 0 && now - lastMs < check.silenceHours * 36e5) continue;
        const daysLeft = Math.ceil((new Date(check.dateStr).getTime() - now) / (1e3 * 60 * 60 * 24));
        let detail = "";
        if (daysLeft <= 0) detail = `\u274C ${check.label}\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u7ACB\u5373\u7EED\u671F\u5904\u7406\uFF01`;
        else if (daysLeft <= 7) detail = `\u{1F6A8} ${check.label}\u7D27\u6025\u9884\u8B66\uFF0C\u4EC5\u5269 ${daysLeft} \u5929\u5230\u671F\uFF0C\u8BF7\u5C3D\u5FEB\u7EED\u671F\uFF01`;
        else if (daysLeft <= 30) detail = `\u23F0 ${check.label}\u5230\u671F\u63D0\u9192\uFF0C\u8FD8\u6709 ${daysLeft} \u5929\u5230\u671F\uFF0C\u8BF7\u6CE8\u610F\u7EED\u671F\u3002`;
        if (detail) {
          const sent = await sendAlertToAllChannels(env, monitor, "DOWN", detail);
          if (sent) await env.DB.prepare(`UPDATE monitors SET ${check.lastAlertField} = ? WHERE id = ?`).bind((/* @__PURE__ */ new Date()).toISOString(), monitor.id).run();
        }
      }
    });
    await Promise.all(tasks);
    console.log("Expiry alert check completed.");
  } catch (e) {
    console.error("Expiry alert check error:", e);
  }
}
__name(checkExpiryAlerts, "checkExpiryAlerts");
function buildAlertMessage(monitor, type, detail) {
  const isDown = type === "DOWN";
  const title = isDown ? "\u{1F534} \u670D\u52A1\u6545\u969C\u62A5\u8B66" : "\u{1F7E2} \u670D\u52A1\u6062\u590D\u901A\u77E5";
  const statusText = isDown ? "\u6545\u969C" : "\u6B63\u5E38";
  const time = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  return { title, statusText, time, isDown, detail, monitorName: monitor.name, monitorUrl: monitor.url };
}
__name(buildAlertMessage, "buildAlertMessage");
async function sendAlertToAllChannels(env, monitor, type, detail) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM notification_channels WHERE enabled = 1").all();
    if (results && results.length > 0) {
      const tasks = results.map((ch) => sendToChannel(ch, monitor, type, detail));
      const outcomes = await Promise.allSettled(tasks);
      return outcomes.some((o) => o.status === "fulfilled" && o.value === true);
    }
  } catch (e) {
    console.error("Failed to read notification channels from DB:", e);
  }
  if (env.DINGTALK_ACCESS_TOKEN && env.DINGTALK_SECRET) {
    const fallbackChannel = {
      id: 0,
      type: "dingtalk",
      name: "ENV DingTalk",
      enabled: 1,
      config: JSON.stringify({ access_token: env.DINGTALK_ACCESS_TOKEN, secret: env.DINGTALK_SECRET }),
      created_at: ""
    };
    return sendToChannel(fallbackChannel, monitor, type, detail);
  }
  console.warn("No notification channels configured.");
  return false;
}
__name(sendAlertToAllChannels, "sendAlertToAllChannels");
async function sendToChannel(channel, monitor, type, detail) {
  const cfg = JSON.parse(channel.config);
  try {
    switch (channel.type) {
      case "dingtalk":
        return await sendDingTalk(cfg, monitor, type, detail);
      case "wecom":
        return await sendWeCom(cfg, monitor, type, detail);
      case "feishu":
        return await sendFeishu(cfg, monitor, type, detail);
      case "telegram":
        return await sendTelegram(cfg, monitor, type, detail);
      case "webhook":
        return await sendWebhook(cfg, monitor, type, detail);
      default:
        console.warn(`Unknown channel type: ${channel.type}`);
        return false;
    }
  } catch (e) {
    console.error(`Failed to send via ${channel.type} (${channel.name}):`, e);
    return false;
  }
}
__name(sendToChannel, "sendToChannel");
async function sendDingTalk(cfg, monitor, type, detail) {
  const { access_token, secret } = cfg;
  if (!access_token || !secret) {
    console.warn("DingTalk config missing.");
    return false;
  }
  const timestamp = Date.now();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}
${secret}`));
  const signEncoded = encodeURIComponent(btoa(String.fromCharCode(...new Uint8Array(signature))));
  const webhookUrl = `https://oapi.dingtalk.com/robot/send?access_token=${access_token}&timestamp=${timestamp}&sign=${signEncoded}`;
  const isDown = type === "DOWN";
  const time = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const title = isDown ? "\u{1F534} \u670D\u52A1\u6545\u969C\u62A5\u8B66" : "\u{1F7E2} \u670D\u52A1\u6062\u590D\u901A\u77E5";
  const statusLabel = isDown ? '<font color="#cc0000">\u26A0 \u6545\u969C</font>' : '<font color="#00aa55">\u2705 \u6062\u590D\u6B63\u5E38</font>';
  const markdownText = [
    `## ${title}`,
    ``,
    `| | |`,
    `| --- | --- |`,
    `| **\u76D1\u63A7\u540D\u79F0** | ${monitor.name} |`,
    `| **\u76D1\u63A7\u5730\u5740** | [${monitor.url}](${monitor.url}) |`,
    `| **\u5F53\u524D\u72B6\u6001** | ${statusLabel} |`,
    `| **\u8BE6\u7EC6\u4FE1\u606F** | ${detail} |`,
    ``,
    `---`,
    `<font color="#999999">\u{1F550} ${time} &nbsp;\xB7&nbsp; Uptime Monitor</font>`
  ].join("\n");
  const resp = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ msgtype: "markdown", markdown: { title, text: markdownText } }) });
  const result = await resp.json();
  if (result.errcode !== 0) {
    console.error("DingTalk API Error:", result);
    return false;
  }
  return true;
}
__name(sendDingTalk, "sendDingTalk");
async function sendWeCom(cfg, monitor, type, detail) {
  const { key } = cfg;
  if (!key) {
    console.warn("WeCom config missing.");
    return false;
  }
  const isDown = type === "DOWN";
  const time = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const title = isDown ? "\u{1F534} \u670D\u52A1\u6545\u969C\u62A5\u8B66" : "\u{1F7E2} \u670D\u52A1\u6062\u590D\u901A\u77E5";
  const statusLine = isDown ? '> \u5F53\u524D\u72B6\u6001\uFF1A<font color="warning">\u26A0 \u6545\u969C</font>' : '> \u5F53\u524D\u72B6\u6001\uFF1A<font color="info">\u2705 \u6062\u590D\u6B63\u5E38</font>';
  const content = [`**${title}**`, ``, `> \u76D1\u63A7\u540D\u79F0\uFF1A**${monitor.name}**`, `> \u76D1\u63A7\u5730\u5740\uFF1A[${monitor.url}](${monitor.url})`, statusLine, `> \u8BE6\u7EC6\u4FE1\u606F\uFF1A${detail}`, ``, `<font color="comment">\u{1F550} ${time} \xB7 Uptime Monitor</font>`].join("\n");
  const resp = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ msgtype: "markdown", markdown: { content } }) });
  const result = await resp.json();
  if (result.errcode !== 0) {
    console.error("WeCom API Error:", result);
    return false;
  }
  return true;
}
__name(sendWeCom, "sendWeCom");
async function sendFeishu(cfg, monitor, type, detail) {
  const { webhook_url, secret } = cfg;
  if (!webhook_url) {
    console.warn("Feishu config missing.");
    return false;
  }
  const isDown = type === "DOWN";
  const time = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const title = isDown ? "\u{1F534} \u670D\u52A1\u6545\u969C\u62A5\u8B66" : "\u{1F7E2} \u670D\u52A1\u6062\u590D\u901A\u77E5";
  const card = {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: title }, template: isDown ? "red" : "green" },
    elements: [
      { tag: "div", fields: [{ is_short: true, text: { tag: "lark_md", content: `**\u76D1\u63A7\u540D\u79F0**
${monitor.name}` } }, { is_short: true, text: { tag: "lark_md", content: `**\u5F53\u524D\u72B6\u6001**
${isDown ? "\u26A0 \u6545\u969C" : "\u2705 \u6062\u590D\u6B63\u5E38"}` } }] },
      { tag: "div", text: { tag: "lark_md", content: `**\u76D1\u63A7\u5730\u5740**
[${monitor.url}](${monitor.url})` } },
      { tag: "div", text: { tag: "lark_md", content: `**\u8BE6\u7EC6\u4FE1\u606F**
${detail}` } },
      { tag: "hr" },
      { tag: "note", elements: [{ tag: "plain_text", content: `\u{1F550} ${time} \xB7 Uptime Monitor` }] }
    ]
  };
  const body = { msg_type: "interactive", card };
  if (secret) {
    const timestamp = Math.floor(Date.now() / 1e3);
    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(`${timestamp}
${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(""));
    body.timestamp = String(timestamp);
    body.sign = btoa(String.fromCharCode(...new Uint8Array(signature)));
  }
  const resp = await fetch(webhook_url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await resp.json();
  if (result.code !== 0) {
    console.error("Feishu API Error:", result);
    return false;
  }
  return true;
}
__name(sendFeishu, "sendFeishu");
async function sendTelegram(cfg, monitor, type, detail) {
  const { bot_token, chat_id } = cfg;
  if (!bot_token || !chat_id) {
    console.warn("Telegram config missing.");
    return false;
  }
  const isDown = type === "DOWN";
  const time = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const text = [
    isDown ? "\u{1F534} <b>\u670D\u52A1\u6545\u969C\u62A5\u8B66</b>" : "\u{1F7E2} <b>\u670D\u52A1\u6062\u590D\u901A\u77E5</b>",
    ``,
    `\u{1F4CC} <b>\u76D1\u63A7\u540D\u79F0</b>  ${monitor.name}`,
    `\u{1F310} <b>\u76D1\u63A7\u5730\u5740</b>  <a href="${monitor.url}">${monitor.url}</a>`,
    `\u{1F6A6} <b>\u5F53\u524D\u72B6\u6001</b>  ${isDown ? "\u26A0\uFE0F <b>\u6545\u969C</b>" : "\u2705 <b>\u6062\u590D\u6B63\u5E38</b>"}`,
    `\u{1F4CB} <b>\u8BE6\u7EC6\u4FE1\u606F</b>  ${detail}`,
    ``,
    `<i>\u{1F550} ${time} \xB7 Uptime Monitor</i>`
  ].join("\n");
  const resp = await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id, text, parse_mode: "HTML", disable_web_page_preview: true }) });
  const result = await resp.json();
  if (!result.ok) {
    console.error("Telegram API Error:", result);
    return false;
  }
  return true;
}
__name(sendTelegram, "sendTelegram");
async function sendWebhook(cfg, monitor, type, detail) {
  const { url, method, headers: headersStr } = cfg;
  if (!url) {
    console.warn("Webhook config missing.");
    return false;
  }
  const msg = buildAlertMessage(monitor, type, detail);
  const payload = { event: type === "DOWN" ? "monitor.down" : "monitor.up", monitor: { name: msg.monitorName, url: msg.monitorUrl }, status: msg.statusText, detail: msg.detail, timestamp: msg.time };
  let parsedHeaders = { "Content-Type": "application/json" };
  if (headersStr) {
    try {
      parsedHeaders = { ...parsedHeaders, ...JSON.parse(headersStr) };
    } catch {
    }
  }
  const resp = await fetch(url, { method: (method || "POST").toUpperCase(), headers: parsedHeaders, body: JSON.stringify(payload) });
  return resp.ok;
}
__name(sendWebhook, "sendWebhook");
async function updateDomainCertInfo(env, monitor) {
  console.log(`Updating info for ${monitor.url}`);
  try {
    const urlObj = new URL(monitor.url);
    const domain = urlObj.hostname;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) {
      console.log(`Skipping cert/domain check for IP address: ${domain}`);
      return;
    }
    let certExpiry = null;
    try {
      const browserUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const fetchCerts = /* @__PURE__ */ __name(async (searchDomain) => {
        try {
          const res = await fetch(`https://crt.sh/?q=${searchDomain}&output=json`, { headers: { "User-Agent": browserUA } });
          if (!res.ok) return [];
          try {
            return JSON.parse(await res.text());
          } catch {
            return [];
          }
        } catch {
          return [];
        }
      }, "fetchCerts");
      let certs = await fetchCerts(domain);
      if (certs.length === 0 && domain.split(".").length > 2) {
        const parts = domain.split(".");
        const rootDomain = parts.slice(parts.length - 2).join(".");
        certs = [...await fetchCerts(rootDomain), ...await fetchCerts(`%.${rootDomain}`)];
      }
      if (certs.length > 0) {
        const nowMs = Date.now();
        const parseExpiry = /* @__PURE__ */ __name((s) => new Date(s.replace(" ", "T")).getTime(), "parseExpiry");
        const validCerts = certs.filter((c) => {
          const exp = parseExpiry(c.not_after);
          return !isNaN(exp) && exp > nowMs;
        });
        const source = validCerts.length > 0 ? validCerts : certs;
        const sorted = source.sort((a, b) => parseExpiry(b.not_after) - parseExpiry(a.not_after));
        certExpiry = sorted[0].not_after.replace(" ", "T");
        console.log(`Found cert expiry for ${domain}: ${certExpiry}`);
      }
    } catch (e) {
      console.warn("Failed to fetch cert info:", e);
    }
    let domainExpiry = null;
    try {
      const rdapRes = await fetch(`https://rdap.org/domain/${domain}`);
      if (rdapRes.ok) {
        const rdapData = await rdapRes.json();
        const expEvent = (rdapData.events || []).find((e) => e.eventAction.includes("expiration"));
        if (expEvent) domainExpiry = expEvent.eventDate;
      }
    } catch (e) {
      console.warn("Failed to fetch RDAP info:", e);
    }
    if (certExpiry || domainExpiry) {
      await env.DB.prepare("UPDATE monitors SET cert_expiry = ?, domain_expiry = ? WHERE id = ?").bind(certExpiry, domainExpiry, monitor.id).run();
      console.log(`Updated info for ${domain}: Cert=${certExpiry}, Domain=${domainExpiry}`);
    }
  } catch (e) {
    console.error("Error in updateDomainCertInfo:", e);
  }
}
__name(updateDomainCertInfo, "updateDomainCertInfo");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
