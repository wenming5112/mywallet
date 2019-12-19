<template>
  <div id="app">
    <p> 创建钱包</p>
    <input v-bind:value="12345678" name="password" id="password"/>
    <button @click="createwallet">创建钱包</button>
  </div>
</template>

<script>
  let axios = require('axios');
  let bip39 = require('bip39');
  let hdkey = require('ethereumjs-wallet/hdkey');
  let util = require('ethereumjs-util');
  import {toBuffer, bufferToHex, privateToPublic} from 'ethereumjs-util';
  import secp256k1 from 'secp256k1';
  import createKeccakHash from 'keccak';

  export default {
    name: 'App',
    methods: {
      createwallet: function () {
        //==============================================================================================================
        console.log("==============================================================================================================")
        // 用户钱包密码
        let password = document.getElementById("password").value;
        console.log("密码：" + password)
        console.log("==============================================================================================================")
        // 助记词
        let mnemonic = bip39.generateMnemonic();
        console.log("助记词: " + mnemonic);
        console.log("==============================================================================================================")
        // 种子
        let seed = bip39.mnemonicToSeedSync(mnemonic, password);
        // HD钱包
        let hdWallet = hdkey.fromMasterSeed(seed);
        // 钥匙对
        let key1 = hdWallet.derivePath("m/39'/00'/0'/0/0");
        let walletPrivateKey = key1._hdkey._privateKey;
        console.log("bip39私钥：" + bufferToHex(walletPrivateKey))
        console.log("==============================================================================================================")
        let publickey = key1._hdkey._publicKey;
        console.log("bip39公钥（已压缩）：" + bufferToHex(publickey))
        console.log("==============================================================================================================")
        // 就是这个方法得到130位的16进制公钥-----通过私钥推公钥
        console.log("bip39公钥（未压缩）：" + bufferToHex(privateToPublic(walletPrivateKey)))
        console.log("==============================================================================================================")
        // 根据公钥得到地址
        let address1 = util.pubToAddress(key1._hdkey._publicKey, true);
        // 转换地址
        address1 = util.toChecksumAddress(address1.toString('hex'));
        console.log("钱包地址:" + address1);
        console.log("==============================================================================================================")
        //==============================================================================================================
        //==============================================================================================================
        // 根据私钥去生成公钥，来自独立的包secp256k1
        // let pu = generatePublicKey(walletPrivateKey);
        // console.log(pu);
        // console.log("生成的公钥：" + bufferToHex(pu) + " 长度：" + bufferToHex(pu).length)
        //==============================================================================================================
        let msg = "123456";
        //  将消息转成字符串
        msg = JSON.stringify(msg);
        console.log("消息原文：" + msg)
        console.log("==============================================================================================================")
        // 将消息字符串转成hash字节，这个hash算法得改成hash.sha3
        //let hash = util.sha256(msg);
        let hash = createKeccakHash('keccak256').update(msg).digest();
        console.log("消息摘要转16进制：" + bufferToHex(hash))
        console.log("==============================================================================================================")
        // 对消息hash进行签名
        let sig = secp256k1.sign(hash, walletPrivateKey);

        let ret = {};
        // 分离签名得到r,s,v
        ret.r = sig.signature.slice(0, 32);
        ret.s = sig.signature.slice(32, 64);
        ret.v = sig.recovery;

        let vHex = bufferToHex(ret.v);
        let rHex = bufferToHex(ret.r);
        let sHex = bufferToHex(ret.s);

        console.log("recId：" + vHex)
        console.log("==============================================================================================================")
        console.log("签名前32位：" + rHex)
        console.log("==============================================================================================================")
        console.log("签名后32位：" + sHex)
        console.log("==============================================================================================================")
        let signd = signBuffer(ret);
        signd = bufferToHex(signd);
        console.log("签名（16进制）：" + signd);
        console.log("==============================================================================================================")
        //==============================================================================================================
        // // 提取公钥
        // let recoverPublicKey = bufferToHex(recovery(ret.r, ret.s, ret.v, msg));
        // // 已压缩
        // console.log("提取公钥：" + recoverPublicKey + " 长度：" + recoverPublicKey.length);
        // // 将公钥转byte数组并进行验签
        // let signature = Buffer.concat([bufferFrom(ret.r), bufferFrom(ret.s)], 64)
        // console.log("验签：" + secp256k1.verify(hash, signature, pu));
        //==============================================================================================================
        //==============================================================================================================
        let data = {
          message: msg,
          addr: address1,
          vx: vHex,
          rx: rHex,
          sx: sHex,
        }
        axios.post('http://192.168.2.117:8084/tldollar/userWallet/transferToUserWallet', data, {
          //方式2通过transformRequest方法发送数据，本质还是将数据拼接成字符串
          transformRequest: [
            function (data) {
              let params = '';
              for (let index in data) {
                params += index + '=' + data[index] + '&';
              }
              return params;
            }
          ]
        }).then(resp => {
          console.log(resp.data);
        }).catch(err => {
          console.log('请求失败：' + err.status + ',' + err.statusText);
        });

        // ******************************************************************
        /**
         * secp256k1(ECDSA)通过私钥生成公钥
         * @param {string} privateKey 私钥
         * @param {boolean} compressed 是否为压缩格式
         */
        function generatePublicKey(privateKey, compressed = true) {
          let publicKey = secp256k1.publicKeyCreate(privateKey, compressed);
          return publicKey;
        }

        // 根据消息和签名恢复公钥
        function recovery(r, s, v, msg) {
          let signature = Buffer.concat([bufferFrom(r), bufferFrom(s)], 64)
          let recovery = v;
          if (recovery !== 0 && recovery !== 1) {
            throw new Error('Invalid signature v value')
          }
          //let hash = createKeccakHash('keccak256').update(msg).digest();
          let hash = util.sha256(msg);
          let senderPubKey = secp256k1.recover(hash, signature, recovery);
          return secp256k1.publicKeyConvert(senderPubKey, true);
        }

        /**
         * 验签
         * @param {*} msg 原始数据
         * @param {*} r signature[0-32)
         * @param {*} s signature(32,64]
         * @param {*} pubKeyBuffer 公钥
         */
        function verify(msg, r, s, pubKeyBuffer) {
          let signature = Buffer.concat([bufferFrom(r), bufferFrom(s)], 64)
          let hash = createKeccakHash('keccak256').update(msg).digest();
          return secp256k1.verify(hash, signature, pubKeyBuffer);
        }

        function bufferFrom(v) {
          if (!Buffer.isBuffer(v)) {
            if (Array.isArray(v)) {
              v = Buffer.from(v)
            } else if (typeof v === 'string') {
              if (util.isHexString(v)) {
                v = Buffer.from(util.padToEven(util.stripHexPrefix(v)), 'hex')
              } else {
                v = Buffer.from(v)
              }
            } else if (typeof v === 'number') {
              v = util.intToBuffer(v)
            } else if (v === null || v === undefined) {
              v = Buffer.allocUnsafe(0)
            } else if (BN.isBN(v)) {
              v = v.toArrayLike(Buffer)
            } else if (v.toArray) {
              // converts a BN to a Buffer
              v = Buffer.from(v.toArray())
            } else {
              throw new Error('invalid type')
            }
          }
          return v
        }

        function signBuffer(ret) {
          return Buffer.concat([
            bufferFrom(ret.r),
            bufferFrom(ret.s),
            bufferFrom(ret.v)
          ]);
        }

        // #####################################################################
      }
    }
  }

</script>

<style>
  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
  }
</style>
