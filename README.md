# Langchain 问答 Demo

## 简介

这是一个包含前端建议界面及后端服务脚本的 Langchain 文档会话问答的 Demo，并对提示模板进行了简单的自定义，可以根据用户提出的问题，在给定的文档上下文中进行回答。本脚本使用了多个第三方库，包括 Langchain、OpenAI 等。

## 安装

1. 首先，请确保您已经安装了 Node.js 运行环境。
2. 在终端中进入脚本所在的目录。
3. 运行`npm install`命令安装所需的依赖包。

## 使用

1. 在终端中执行`export OPENAI_API_KEY="sk-..."`。
2. 运行`node server.js`命令启动脚本。
3. 在浏览器中访问`http://localhost:3002/ask?question=YOUR_QUESTION`，其中`YOUR_QUESTION`为您要提出的问题。
4. 您也可以在当前目录下执行`yarn start`或`npm run start`来启动前端页面进行访问。
5. 脚本将返回一个 JSON 格式的结果，其中`answer`字段为回答的内容。

## 注意事项

1. 在运行脚本之前，请确保您已经获得了 OpenAI API Key，否则脚本将无法正常运行。
2. 请确保您的控制台网络环境能够访问`api.openai.com`。
3. 将您想要使用的文档更名为`book.text`，放置到`server.js`的同级目录中。
4. 确保您的 Node 版本高于等于 18。