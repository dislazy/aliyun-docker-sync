## 懒人版镜像同步页面
日常自用aliyun镜像仓库，所以镜像有需要将dockerhub的镜像同步到aliyun仓库的需求，所有有了这个仓库，`work.js`的大佬源码copy自[ali_dockerhub](https://github.com/zouzonghao/ali_dockerhub)项目。

## 本仓库ENV配置
```
- DOCKER_USERNAME  目标镜像仓库用户名
- DOCKER_PASSWORD  目标镜像仓库密码
```

## work.js的ENV配置
```
- GITHUB_TOKEN  // github的请求api权限token
- GITHUB_OWNER  //github用户名
- GITHUB_REPO  //github仓库名
- CHECK_TOKEN  //自己填充的token，防刷
```


## 可选增加turnstile验证码
```
#js引入
 <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback" defer></script>
```
```
#验证码的js放置
<div class="flex justify-between">
#验证码的存放位置
            <div class="cf-turnstile" data-sitekey="0xAAAAAAAAAA"></div>
              <button @click="addImage" type="button" class="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300">添加镜像</button>
              <button @click="syncImages" type="button" class="bg-green-400 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300">同步镜像</button>
            </div>
```
