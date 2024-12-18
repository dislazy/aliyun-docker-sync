export async function onRequest({ request, params, env }) {
    try {
        // 获取 Vue 和 Tailwind 的资源
        const vueScript = 'https://unpkg.com/vue@3/dist/vue.global.prod.js';
        const tailwindCSS = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';

        // HTML 模板
        const appTemplate = `
          <div class="min-h-screen bg-gradient-to-r from-pink-100 to-blue-100 flex items-center justify-center">
            <div class="bg-white shadow-lg rounded-lg p-8 max-w-xl w-full">
              <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">Docker 镜像同步</h1>
              <div v-for="(image, index) in images" :key="index" class="border border-gray-200 rounded-lg p-6 mb-6 bg-white shadow-sm">
                <h2 class="text-xl font-semibold text-gray-700 mb-4">镜像 {{ index + 1 }}</h2>
                <div class="mb-4">
                  <label class="block text-gray-700 text-sm font-bold mb-2">来源镜像（例：vaultwarden/server:1.26.0）:</label>
                  <input type="text" v-model="image.source" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                </div>
                <div class="mb-4">
                  <label class="block text-gray-700 text-sm font-bold mb-2">CPU架构:</label>
                  <select v-model="image.platform" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="linux/amd64">linux/amd64</option>
                    <option value="linux/arm64">linux/arm64</option>
                    <option value="linux/arm/v7">linux/arm/v7</option>
                  </select>
                </div>
                <div class="mb-4">
                  <label class="block text-gray-700 text-sm font-bold mb-2">目标镜像（例：bitwarden:AMD64_1.26.0）:</label>
                  <input type="text" v-model="image.target" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
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

        // 主页面 HTML
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
                  repoOwner: '${env.REPO_OWNER}', // 从环境变量读取
                  repoName: '${env.REPO_NAME}', // 从环境变量读取
                  images: [{ source: '', target: '', platform: 'linux/amd64' }],
                  message: null,
                  messageClass: null
                };
              },
              methods: {
                addImage() {
                  this.images.push({ source: '', target: '', platform: 'linux/amd64' });
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

                    const now = new Date();
                    const formattedTime = \`\${now.getFullYear()}-\${(now.getMonth() + 1).toString().padStart(2, '0')}-\${now.getDate().toString().padStart(2, '0')} \${now.getHours().toString().padStart(2, '0')}:\${now.getMinutes().toString().padStart(2, '0')}:\${now.getSeconds().toString().padStart(2, '0')}\`;

                    const pullCommands = this.images.map(image => \`docker pull ${env.ALIYUN_REGISTRY}/${env.ALIYUN_NAME_SPACE}/\${image.target}\`).join('<br><br>');

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
                  return '${env.GITHUB_TOKEN}'; // 从环境变量读取
                },
                imageTargets() {
                  return this.images.map(image => {
                    const sourceParts = image.source.split('/');
                    const imageName = sourceParts.length > 1 ? sourceParts[sourceParts.length - 1] : image.source;
                    let platformSuffix = image.platform.split('/')[1].toUpperCase();
                    if (platformSuffix == "ARM"){
                      platformSuffix = "ARM_V7"
                    }
                    return \`\${imageName}_\${platformSuffix}\`;
                  });
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
    return new Response("Method Not Allowed", { status: 405 });
};
