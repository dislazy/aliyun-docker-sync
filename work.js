addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === 'GET') {
    try {
      const vueScript = await fetch('https://unpkg.com/vue@3/dist/vue.global.prod.js').then(r => r.text());
      const tailwindCSS = await fetch('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css').then(r => r.text());

      const appTemplate = `
        <div class="min-h-screen bg-gradient-to-r from-pink-100 to-blue-100 flex items-center justify-center">
          <div class="bg-white shadow-lg rounded-lg p-8 max-w-xl w-full">
            <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">Docker 镜像同步</h1>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">全局TOKEN:</label>
              <input type="password" v-model="token" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
            </div>

            <div v-for="(image, index) in images" :key="index" class="border border-gray-200 rounded-lg p-6 mb-6 bg-white shadow-sm">
              <h2 class="text-xl font-semibold text-gray-700 mb-4">镜像 {{ index + 1 }}</h2>
              <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">来源镜像（例：vaultwarden/server:1.26.0）:</label>
                <input type="text" v-model="image.source" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
              </div>

              <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">目标镜像（例：bitwarden:1.26.0）:</label>
                <input type="text" v-model="image.target" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
              </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">地域:</label>
              <input type="text" v-model="image.region" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">命名空间:</label>
              <input type="text" v-model="image.namespace" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
            </div>
              <button @click="removeImage(index)" type="button" class="w-full bg-red-400 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300">删除</button>
            </div>
            <div class="flex justify-between">
              <button @click="addImage" type="button" class="bg-blue-400 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300">添加镜像</button>
              <button @click="syncImages" type="button" class="bg-green-400 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300">同步镜像</button>
            </div>
            <div v-if="message" class="mt-6 p-4 bg-gray-100 rounded-lg" :class="messageClass">
              <p class="text-left overflow-auto text-gray-800" v-html="message"></p>
            </div>
          </div>
        </div>
      `;

      const html = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Docker Image Sync</title>
        <style>${tailwindCSS}</style>
      </head>
      <body class="bg-gray-50">
        <div id="app"></div>
        <script>${vueScript}</script>
        <script>
          const { createApp, h } = Vue;

          const App = {
            data() {
              return {
                repoOwner: '${GITHUB_OWNER}', // 从环境变量读取
                repoName: '${GITHUB_REPO}', // 从环境变量读取
                images: [{ source: 'vaultwarden/server:1.26.0', target: 'bitwarden:1.26.0', region: 'shanghai',namespace:'mirco_service'}],
                message: null,
                messageClass: null,
                token:''
              };
            },
            methods: {
              addImage() {
                this.images.push({ source: '', target: '', region: 'shanghai',namespace:'mirco_service'});
              },
              removeImage(index) {
                this.images.splice(index, 1);
              },
              async syncImages() {
                if (!this.githubToken) {
                  this.message = 'GitHub Token未配置';
                  this.messageClass = 'bg-red-100 text-red-600';
                  return;
                }
                if (this.images.some(item => !item.source || !item.target)) {
                  this.message = '请填写完整的镜像信息';
                  this.messageClass = 'bg-red-100 text-red-600';
                  return;
                }
                if (this.token !== '${CHECK_TOKEN}') {
                  this.message = 'token错误，无法执行镜像同步任务';
                  this.messageClass = 'bg-red-100 text-red-600';
                  return;
                }

                try {
                  const response = await fetch(
                    \`https://api.github.com/repos/\${this.repoOwner}/\${this.repoName}/dispatches\`,
                    {
                      method: 'POST',
                      headers: {
                        Accept: 'application/vnd.github.v3+json',
                        Authorization: \`token \${this.githubToken}\`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        event_type: 'sync_docker',
                        client_payload: {
                          images: this.images,
                          message: 'github action sync'
                        }
                      })
                    }
                  );
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(\`HTTP error \${response.status}: \${errorData.message || response.statusText}\`);
                  }

                  // 获取当前时间
                  const now = new Date();
                  const formattedTime = \`\${now.getFullYear()}-\${(now.getMonth() + 1).toString().padStart(2, '0')}-\${now.getDate().toString().padStart(2, '0')} \${now.getHours().toString().padStart(2, '0')}:\${now.getMinutes().toString().padStart(2, '0')}:\${now.getSeconds().toString().padStart(2, '0')}\`;

                  // 生成拉取命令
                  const pullCommands = this.images.map(image => \`docker pull registry.cn-\${image.region}\.aliyuncs.com/\${image.namespace}\/\${image.target}\`).join('<br><br>');

                  // 更新消息
                  this.message = \`同步请求已发送，时间：\${formattedTime}<br>稍等30S~60S后，请执行以下拉取命令：<br><br>\${pullCommands}<br>\`;
                  this.messageClass = 'bg-green-100 text-green-600';
                } catch (error) {
                  console.error("Error:", error);
                  this.message = \`同步请求失败： \${error.message}\`;
                  this.messageClass = 'bg-red-100 text-red-600';
                }
              }
            },
            computed: {
              githubToken() {
                return '${GITHUB_TOKEN}'; // 从环境变量读取
              },
              imageTargets() {
                return ''
              }
            },
            watch: {
              imageTargets(newTargets) {
                this.images.forEach((image, index) => {
                  image.target = newTargets[index];
                });
              }
            },
            template: \`${appTemplate}\`
          };

          const app = createApp(App);
          app.mount('#app');
        </script>
      </body>
      </html>`;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      });
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
  return new Response("Method Not Allowed", { status: 405 });
}