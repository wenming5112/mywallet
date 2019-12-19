import axios from 'axios';
import qs from 'qs'
import router from '../router'
import { MessageBox} from 'mint-ui'

// 注意点,按照以下写
var instance = axios.create();
instance.defaults.timeout = 10000;
instance.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

export default {
  fetchGet(url, params = {}) {
    return new Promise((resolve, reject) => {
      axios.get(url, params).then(res => {
        if(res.data.code === 302) {
          MessageBox('提示', '登录失效,请重新登录');
          MessageBox.alert('登录失效,请重新登录', '提示').then(action => {
            router.push("/login");
          });
        }
        resolve(res.data);
      }).catch(error => {
        reject(error);
      })
    })
  },
  fetchPost(url, params = {}) {
    /*
    axios post请求后端接收不到参数问题：

    解决方案一：有效，但是兼容性不是很好，不是所有浏览器都支持
        let data = new URLSearchParams()
        for (var key in params) {
            data.append(key, params[key])
        }
    */

    // 解决方案二：使用qs模块(axios中自带),使用qs.stringify()序列化params
    return new Promise((resolve, reject) => {
      axios.post(url, qs.stringify(params)).then(res => {
        resolve(res.data);
      }).catch(error => {
        reject(error);
      })
    })
  }
}
