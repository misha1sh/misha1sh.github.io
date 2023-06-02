(function(){"use strict";var n={7978:function(n,e,t){var r=t(9242),i=t(3396);function a(n,e,t,r,a,o){const s=(0,i.up)("Main");return(0,i.wg)(),(0,i.j4)(s)}var o=t(4870),s=t(7139),d=t(4469),f=t(3935),l=t(7294),p=t(6657),_=t(5093),u=t(50),c=t(6687),m=t(9783),w=t(5188),g='import micropip\n\nimport jsinfer\n\nmicropip.add_mock_package("docopt", "0.6.2", modules = {\n    "docopt": """\n        docopt = 1\n    """\n})\n\nfor i in "pymorphy3 numpy navec setuptools razdel".split():\n    await micropip.install(i)\n# await micropip.install("")/\n# await micropip.install("sacremoses")\n# await micropip.install("")\n# await micropip.install("")\n# await micropip.install("")\n\nimport numpy as np\nimport random\nimport pymorphy3\nimport numpy as np\nimport math\nimport pickle\nfrom razdel import tokenize\n\nNO_PUNCT = 0\nfrom navec import Navec\nimport itertools\n# from sacremoses import MosesPunctNormalizer\nfrom pyodide.http import pyfetch\nimport os\n\n# punctuation_normalizer = MosesPunctNormalizer(\'ru\')\n\nmorph = pymorphy3.MorphAnalyzer()\n\nasync def download_file(file, url):\n    file_path = os.path.join("./", file)\n    if os.path.isfile(file_path):\n        return file_path\n    print("donwloading", file, "to", file_path)\n    # url = BASE_URL + file\n    response = await pyfetch(url)\n    with open(file, "wb") as f:\n        f.write(await response.bytes())\n    return file_path\n\nnavec_path = await download_file(\'hudlit_12B_500K_300d_100q.tar\',\n                                 "https://storage.yandexcloud.net/misha-sh-objects/hudlit_12B_500K_300d_100q.tar")\n        # "/hudlit_12B_500K_300d_100q.tar")\nnavec = Navec.load(navec_path)\n\nresponse = await pyfetch("/params.pickle")\nparams = pickle.loads(await response.bytes())\n\nNUMPY_DTYPE = float\nNAVEC_UNK = navec[\'<unk>\']\nNAVEC_UNK_TORCH = NAVEC_UNK\nNAVEC_PAD_TORCH = navec[\'<pad>\']\n\nUNDEF_TOKEN = "UNDEF"\nPAD_TOKEN = "PAD"\n\n\ndef empty_word_features(params):\n    return np.zeros([params["TOTAL_WORD_FEATURES_CNT"]],\n                        dtype=NUMPY_DTYPE)\n\ndef get_navec_start_idx(params):\n    return params[\'VARIANT_FEATURES_CNT\'] * params[\'VARIANTS_CNT\']\n\ndef pad_word_features(params):\n    res = empty_word_features(params)\n    res[get_navec_start_idx(params): ] = NAVEC_PAD_TORCH\n    return res\n\ndef undef_word_features(params):\n    res = empty_word_features(params)\n    res[get_navec_start_idx(params): ] = NAVEC_UNK_TORCH\n    return res\n\n\nPNCT_TAGS = {\n    \'.\': \'PUNCT_DOT\',\n    \'!\': \'PUNCT_DOT\',\n    \'?\': \'PUNCT_DOT\',\n    \',\': \'PUNCT_COMMA\',\n    \'-\': \'PUNCT_DASH\',\n    \'.\':\'PUNCT_DOT\',\n    \'"\': \'PUNCT_QUOTE\',\n    #\'\\\\\'\': \'PUNCT_QUOTE\',\n    \'(\': \'PUNCT_LEFT_PARENTHESIS\',\n    \')\': \'PUNCT_RIGHT_PARENTHESIS\',\n}\n\ndef get_word_features(word, params):\n    if word == PAD_TOKEN:\n        return pad_word_features(params)\n    if word == UNDEF_TOKEN:\n        return undef_word_features(params)\n\n    additional_tags = []\n\n    res = empty_word_features(params)\n    if not str.isalpha(word[0]):\n        # word_punct = punctuation_normalizer(word).strip()\n        word_punct = word.strip()[0]\n        if word_punct in PNCT_TAGS:\n            additional_tags.append(PNCT_TAGS[word_punct])\n\n    if str.isupper(word[0]):\n        additional_tags.append(\'CAPITALIZED\')\n\n    use_navec = True\n\n    variant_features_cnt = params[\'VARIANT_FEATURES_CNT\']\n    for i, variant in enumerate(morph.parse(word)[:params["VARIANTS_CNT"]]):\n        tags = variant.tag._grammemes_tuple\n\n        for tag in itertools.chain(tags, additional_tags):\n            tag_index = params["feature_tags_dict"].get(tag, None)\n            if tag_index:\n                res[i * variant_features_cnt + tag_index] = True\n            if i == 0 and tag in params[\'CUT_NAVEC_TAGS_SET\']:\n                use_navec = False\n        res[i * variant_features_cnt + params["VARIANT_PROB_IDX"]] = variant.score\n\n\n    if params[\'USE_NAVEC\'] and use_navec:\n        res[get_navec_start_idx(params): ] = navec.get(word.lower(), NAVEC_UNK)\n\n    return res\n\n\nfrom collections import deque\nimport random\n\n#https://stackoverflow.com/a/15993515\nclass ListRandom(object):\n    def __init__(self):\n        self.items = []\n\n    def add_item(self, item):\n        self.items.append(item)\n\n    def remove_item(self, position):\n        last_item = self.items.pop()\n        if position != len(self.items):\n            self.items[position] = last_item\n\n    def __len__(self):\n        return len(self.items)\n\n    def pop_random(self):\n        assert len(self.items) > 0\n        i = random.randrange(0, len(self.items))\n        element = self.items[i]\n        self.remove_item(i)\n        return element\n\n\n\n\nclass Stream:\n    def __init__(self, generator):\n        try:\n            self.generator = iter(generator)\n        except TypeError:\n            self.generator = generator\n\n    def __iter__(self):\n        return self\n\n    def __next__(self):\n        return next(self.generator)\n\n    @staticmethod\n    def repeat(element, n):\n        def generator():\n          for i in range(n):\n              yield element\n        return Stream(generator())\n\n    def buffered_mix(self, elements_in_buffer_count):\n        def generator():\n            buffer = ListRandom()\n            it = iter(self)\n            while True:\n                while len(buffer) < elements_in_buffer_count:\n                    try:\n                        buffer.add_item(next(it))\n                    except StopIteration:\n                        while len(buffer) > 0:\n                            yield buffer.pop_random()\n                        return\n                yield buffer.pop_random()\n        return Stream(generator())\n\n\n    @staticmethod\n    def mix_streams(streams, weights):\n        def generator():\n            iters = [iter(i) for i in streams]\n            choices = list(range(len(streams)))\n            i = 0\n            while True:\n                try:\n                    i = random.choices(choices, weights)[0]\n                    yield next(iters[i])\n                except StopIteration:\n                    weights[i] = 0\n                    if sum(weights) == 0:\n                        return\n        return Stream(generator())\n\n\n    def chain(self, another_stream):\n        def generator():\n            for i in self:\n                yield i\n            for i in another_stream:\n                yield i\n        return Stream(generator())\n\n    def slide_window(self, window_size):\n        res = deque()\n        for i in self:\n          res.append(i)\n          if len(res) == window_size:\n            yield Stream(res)\n            res.popleft()\n\n    def skip(self, count):\n        def generator():\n            n = count\n            for i in self.generator:\n                n -= 1\n                if n == 0: break\n            for i in self.generator:\n                yield i\n        return Stream(generator())\n\n    def get(self, count):\n        res = []\n        for i in self:\n            res.append(i)\n            if len(res) == count:\n                return res\n        return res\n\n    def limit(self, count):\n        def generator():\n            n = count\n            for i in self.generator:\n                yield i\n                n -= 1\n                if n == 0: break\n        return Stream(generator())\n\n    def map(self, func):\n        def generator():\n            for i in self.generator:\n                yield func(i)\n        return Stream(generator())\n\n    def starmap(self, func):\n        def generator():\n            for i in self.generator:\n                for j in func(i):\n                    yield j\n        return Stream(generator())\n\n    def group(self, n):\n        def generator():\n            grouped = []\n            for i in self.generator:\n                grouped.append(i)\n                if len(grouped) >= n:\n                    yield grouped\n                    grouped = []\n            if len(grouped) != 0:\n                yield grouped\n\n        return Stream(generator())\n\n\n\nimport functools\nfrom collections import deque\nimport random\nrandom.seed(42)\n\n@functools.lru_cache(maxsize=128)\ndef get_word_features_cached(word):\n    return get_word_features(word, params)#.numpy()\n\nclass Substr:\n    def __init__(self, text):\n        self.text = text\n    def __repr__(self) -> str:\n        return f"Substring(-1, -1, {self.text})"\n\ndef d_as_str(d):\n  return "<" + " ".join(map(lambda text: text.text, d))+ ">"\n\n\nasync def infer_optimal(params, text):\n  # print("INFERCENC IS WIERD\\n" * 10)\n  res = []\n  last_inserted_pos = 0\n  def sink(token, log=False):\n    nonlocal last_inserted_pos\n    if token.text == "PAD": return\n    if log: print(\'sink\', token)\n    if isinstance(token, Substr):\n      res.append(token.text)\n      if log: print("added1 ", f"`{token.text}`", token)\n    else:\n      if last_inserted_pos != token.start:\n        res.append(text[last_inserted_pos: token.start])\n        if log: print("added2 ", f"`{text[last_inserted_pos: token.start]}`", last_inserted_pos, token.start)\n      last_inserted_pos = token.stop\n      res.append(token.text)\n      if log: print("added3 ", f"`{token.text}`", token)\n\n  def skip(token, log=False):\n    nonlocal last_inserted_pos\n    last_inserted_pos = token.stop\n    if log: print(\'skip\', token)\n\n  def sink_remaining():\n     res.append(text[last_inserted_pos:])\n\n\n  async def predict_on_tokens(window_left, window_right, return_probas):\n    features = [get_word_features_cached(i.text) for i in Stream(window_left).chain(window_right)]\n    features_for_batch = np.stack((features, ))\n    arr = np.ascontiguousarray(features_for_batch, dtype=np.float32)\n    output_probas = np.array((await jsinfer.infer(arr)).to_py())\n    # output_probas[0][0] += 2.\n    if return_probas:\n      return params["ID_TO_PUNCTUATION"], output_probas\n    punct_idx = np.argmax(output_probas).item()\n    punct = params["ID_TO_PUNCTUATION"][punct_idx]\n    return punct\n\n\n  window_left = deque()\n  window_right = deque()\n  log = False\n  skip_next = False\n  for i in Stream.repeat(Substr(PAD_TOKEN), params[\'INPUT_WORDS_CNT_LEFT\']) \\\n      .chain(Stream(tokenize(text))) \\\n      .chain(Stream.repeat(Substr(PAD_TOKEN), params["INPUT_WORDS_CNT_RIGHT"])):\n    window_right.append(i)\n    if len(window_right) <= params["INPUT_WORDS_CNT_RIGHT"]:\n        continue\n    assert len(window_right) == params["INPUT_WORDS_CNT_RIGHT"] + 1\n\n    next_ = window_right.popleft()\n    sink(next_)\n    window_left.append(next_)\n    if len(window_left) < params[\'INPUT_WORDS_CNT_LEFT\']:\n      continue\n\n    assert len(window_left) == params["INPUT_WORDS_CNT_LEFT"]\n    assert len(window_right) == params["INPUT_WORDS_CNT_RIGHT"]\n\n    if skip_next or window_right[0].text in \'?!\':\n      prediction = "$skip"\n    else:\n      # params["ID_TO_PUNCTUATION"], output_probas\n      prediction = await predict_on_tokens(window_left, window_right, return_probas=False)\n\n\n    #random.choice([" ", "."])\n    if log: print(d_as_str(window_left).rjust(100), prediction.center(6), d_as_str(window_right))\n\n    def is_replaceable_punct(punct):\n      return punct in \',.\'\n\n    if prediction == "$skip":\n      pass\n    elif prediction != "$empty":\n      if is_replaceable_punct(window_right[0].text):\n        if window_right[0].text != prediction:\n          window_right[0].text = prediction\n      else:\n        window_left.append(Substr(prediction))\n        sink(window_left[-1])\n    else:\n      if is_replaceable_punct(window_right[0].text):\n          skip(window_right.popleft())\n\n    skip_next = is_replaceable_punct(window_right[0].text) or window_right[0].text in \'?!\'\n\n    while len(window_left) != params[\'INPUT_WORDS_CNT_LEFT\'] - 1:\n      token = window_left.popleft()\n\n    if log: print(d_as_str(window_left).rjust(100), "      ", d_as_str(window_right))\n\n  for i in window_right:\n    sink(i)\n  sink_remaining()\n  ress = "".join(res)\n  return ress';const h={class:"hello"},y=(0,i._)("h1",null,"Исходный текст: ",-1),T=(0,i._)("h1",null,"Результаты: ",-1),b={key:0,style:{"font-size":"1.2em"}},v={key:0,style:{"background-color":"#8aff8a",display:"inline","white-space":"pre-wrap"}},N={key:1,style:{"background-color":"#ffcfcf",display:"inline","white-space":"pre-wrap"}},k={key:2,style:{display:"inline","white-space":"pre-wrap"}},x={key:1,style:{"font-size":"1.2em","white-space":"pre-wrap"}};c.env.wasm.wasmPaths={"ort-wasm.wasm":"/js/ort-wasm.wasm","ort-wasm-threaded.wasm":"/js/ort-wasm-threaded.wasm","ort-wasm-simd.wasm":"/js/ort-wasm-simd.wasm","ort-wasm-simd-threaded.wasm":"/js/ort-wasm-simd-threaded.wasm"};const P=fetch("https://storage.yandexcloud.net/misha-sh-objects/model2.onnx").then((n=>n.arrayBuffer())).then((n=>c.InferenceSession.create(n,{executionProviders:["wasm"]}))),S=(0,w.F)({indexURL:"/pyodide/"}),C={name:"HelloWorld",props:{},data(){return{input:"",results:"",results_diff:[],showLoadingBar:(0,o.iH)(!0),show_diff:(0,o.iH)(!0)}},created(){async function n(){console.log("RUN");const n=await S;await n.loadPackage("micropip");const e=await P;async function t(n){const t=n.getBuffer("f32"),r=new c.Tensor("float32",t.data,[1,32,489]),i=e.run({input:r}),a=(await i).output;return Array.from(a.data)}await n.registerJsModule("jsinfer",{infer:t}),n.globals.set("text","Тест."),console.log(await n.runPythonAsync(g+"\nawait infer_optimal(params, text)"))}console.log("CREATED"),n().then((()=>{this.showLoadingBar=!1})),S.then((n=>{console.log(n)}))},methods:{async handleInput(){this.showLoadingBar=!0;const n=this.input,e=await S;e.globals.set("text",n);const t=await e.runPythonAsync(g+"\nawait infer_optimal(params, text)");this.results=t,this.results_diff=(0,m.Kx)(n,t),this.showLoadingBar=!1},clearPunctuation(){this.input=this.input.replaceAll(".","").replaceAll(",","")}}};var O=Object.assign(C,{setup(n){return(n,e)=>((0,i.wg)(),(0,i.iD)("div",h,[y,(0,i.Wm)((0,o.SU)(d.Z),{type:"textarea",value:n.input,"onUpdate:value":e[0]||(e[0]=e=>n.input=e),placeholder:"Исходный текст:",clearable:"",autosize:{minRows:5,maxRows:20},style:{"font-size":"1.2em"}},null,8,["value"]),(0,i.Wm)((0,o.SU)(f.Z),{align:"center"},{default:(0,i.w5)((()=>[(0,i.Wm)((0,o.SU)(l.ZP),{type:"info",onClick:n.handleInput,disabled:n.showLoadingBar},{default:(0,i.w5)((()=>[(0,i.Uk)("Раставить пунктуацию")])),_:1},8,["onClick","disabled"]),(0,i.Wm)((0,o.SU)(l.ZP),{type:"info",onClick:n.clearPunctuation,disabled:0==n.input.length},{default:(0,i.w5)((()=>[(0,i.Uk)(" Очистить пунктуацию из исходного текста")])),_:1},8,["onClick","disabled"]),(0,i.Wm)((0,o.SU)(p.Z),{checked:n.show_diff,"onUpdate:checked":e[1]||(e[1]=e=>n.show_diff=e),disabled:0==n.results_diff.length||n.showLoadingBar},{default:(0,i.w5)((()=>[(0,i.Uk)(" Показывать разницу с исходным текстом ")])),_:1},8,["checked","disabled"])])),_:1}),T,(0,i.Wm)((0,o.SU)(_.Z),{show:n.showLoadingBar},{description:(0,i.w5)((()=>[(0,i.Uk)(" Загрузка ")])),default:(0,i.w5)((()=>[(0,i.Wm)((0,o.SU)(u.ZP),null,{default:(0,i.w5)((()=>[n.show_diff?((0,i.wg)(),(0,i.iD)("div",b,[((0,i.wg)(!0),(0,i.iD)(i.HY,null,(0,i.Ko)(n.results_diff.entries(),(([n,e])=>((0,i.wg)(),(0,i.iD)("div",{key:n,style:{display:"inline"}},[e.added?((0,i.wg)(),(0,i.iD)("div",v,(0,s.zw)(e.value),1)):(0,i.kq)("",!0),e.removed?((0,i.wg)(),(0,i.iD)("div",N,(0,s.zw)(e.value),1)):(0,i.kq)("",!0),e.added||e.removed?(0,i.kq)("",!0):((0,i.wg)(),(0,i.iD)("div",k,(0,s.zw)(e.value),1))])))),128))])):((0,i.wg)(),(0,i.iD)("div",x,(0,s.zw)(n.results),1))])),_:1})])),_:1},8,["show"])]))}});const U=O;var A=U,E={name:"App",components:{Main:A}},D=t(89);const R=(0,D.Z)(E,[["render",a]]);var j=R;const I=(0,r.ri)(j);I.mount("#app")}},e={};function t(r){var i=e[r];if(void 0!==i)return i.exports;var a=e[r]={exports:{}};return n[r](a,a.exports,t),a.exports}t.m=n,function(){var n=[];t.O=function(e,r,i,a){if(!r){var o=1/0;for(l=0;l<n.length;l++){r=n[l][0],i=n[l][1],a=n[l][2];for(var s=!0,d=0;d<r.length;d++)(!1&a||o>=a)&&Object.keys(t.O).every((function(n){return t.O[n](r[d])}))?r.splice(d--,1):(s=!1,a<o&&(o=a));if(s){n.splice(l--,1);var f=i();void 0!==f&&(e=f)}}return e}a=a||0;for(var l=n.length;l>0&&n[l-1][2]>a;l--)n[l]=n[l-1];n[l]=[r,i,a]}}(),function(){t.n=function(n){var e=n&&n.__esModule?function(){return n["default"]}:function(){return n};return t.d(e,{a:e}),e}}(),function(){var n,e=Object.getPrototypeOf?function(n){return Object.getPrototypeOf(n)}:function(n){return n.__proto__};t.t=function(r,i){if(1&i&&(r=this(r)),8&i)return r;if("object"===typeof r&&r){if(4&i&&r.__esModule)return r;if(16&i&&"function"===typeof r.then)return r}var a=Object.create(null);t.r(a);var o={};n=n||[null,e({}),e([]),e(e)];for(var s=2&i&&r;"object"==typeof s&&!~n.indexOf(s);s=e(s))Object.getOwnPropertyNames(s).forEach((function(n){o[n]=function(){return r[n]}}));return o["default"]=function(){return r},t.d(a,o),a}}(),function(){t.d=function(n,e){for(var r in e)t.o(e,r)&&!t.o(n,r)&&Object.defineProperty(n,r,{enumerable:!0,get:e[r]})}}(),function(){t.f={},t.e=function(n){return Promise.all(Object.keys(t.f).reduce((function(e,r){return t.f[r](n,e),e}),[]))}}(),function(){t.u=function(n){return"js/"+n+"."+{50:"12e0a2e8",333:"00900aa8",401:"cf235e46",406:"89745463",488:"3fecd343",617:"00010a79",772:"d97d8066",949:"57677d72",950:"02155d1c"}[n]+".js"}}(),function(){t.miniCssF=function(n){}}(),function(){t.g=function(){if("object"===typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(n){if("object"===typeof window)return window}}()}(),function(){t.o=function(n,e){return Object.prototype.hasOwnProperty.call(n,e)}}(),function(){var n={},e="app-web:";t.l=function(r,i,a,o){if(n[r])n[r].push(i);else{var s,d;if(void 0!==a)for(var f=document.getElementsByTagName("script"),l=0;l<f.length;l++){var p=f[l];if(p.getAttribute("src")==r||p.getAttribute("data-webpack")==e+a){s=p;break}}s||(d=!0,s=document.createElement("script"),s.charset="utf-8",s.timeout=120,t.nc&&s.setAttribute("nonce",t.nc),s.setAttribute("data-webpack",e+a),s.src=r),n[r]=[i];var _=function(e,t){s.onerror=s.onload=null,clearTimeout(u);var i=n[r];if(delete n[r],s.parentNode&&s.parentNode.removeChild(s),i&&i.forEach((function(n){return n(t)})),e)return e(t)},u=setTimeout(_.bind(null,void 0,{type:"timeout",target:s}),12e4);s.onerror=_.bind(null,s.onerror),s.onload=_.bind(null,s.onload),d&&document.head.appendChild(s)}}}(),function(){t.r=function(n){"undefined"!==typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(n,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(n,"__esModule",{value:!0})}}(),function(){t.p="/"}(),function(){var n={143:0};t.f.j=function(e,r){var i=t.o(n,e)?n[e]:void 0;if(0!==i)if(i)r.push(i[2]);else{var a=new Promise((function(t,r){i=n[e]=[t,r]}));r.push(i[2]=a);var o=t.p+t.u(e),s=new Error,d=function(r){if(t.o(n,e)&&(i=n[e],0!==i&&(n[e]=void 0),i)){var a=r&&("load"===r.type?"missing":r.type),o=r&&r.target&&r.target.src;s.message="Loading chunk "+e+" failed.\n("+a+": "+o+")",s.name="ChunkLoadError",s.type=a,s.request=o,i[1](s)}};t.l(o,d,"chunk-"+e,e)}},t.O.j=function(e){return 0===n[e]};var e=function(e,r){var i,a,o=r[0],s=r[1],d=r[2],f=0;if(o.some((function(e){return 0!==n[e]}))){for(i in s)t.o(s,i)&&(t.m[i]=s[i]);if(d)var l=d(t)}for(e&&e(r);f<o.length;f++)a=o[f],t.o(n,a)&&n[a]&&n[a][0](),n[a]=0;return t.O(l)},r=self["webpackChunkapp_web"]=self["webpackChunkapp_web"]||[];r.forEach(e.bind(null,0)),r.push=e.bind(null,r.push.bind(r))}();var r=t.O(void 0,[998],(function(){return t(7978)}));r=t.O(r)})();
//# sourceMappingURL=app.fad3028e.js.map