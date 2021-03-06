import axios from 'axios'
import store from '@/store/store'
import router from '@/router';
import * as types from "./../store/mutation-types";
import * as mediaManagerStorage from './Storage.js'
import * as auth from './Auth.js'
/**
 * Api class for communication with the server
 */
class Api {

  /**
   * Store constructor
   */
  constructor() {
    this.mediastorage = mediaManagerStorage;
    this.auth = auth.services;
  }

  /**
   * Get the contents of a directory from the server
   * @returns {Promise}
   */
  axios() {

    axios.defaults.headers.common['Authorization'] = `Bearer ${this.mediastorage.cookies.get('token')}`;
    axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    axios.defaults.headers.common['csrfToken'] = process.env.VUE_APP_SECRET;

    axios.interceptors.response.use(undefined, function axiosRetryInterceptor(err) {
      var config = err.config;
      // If config does not exist or the retry option is not set, reject
      if (!config || !config.retry) return Promise.reject(err);

      // Set the variable for keeping track of the retry count
      config.__retryCount = config.__retryCount || 0;

      // Check if we've maxed out the total number of retries
      if (config.__retryCount >= config.retry) {
        // Reject with the error
        return Promise.reject(err);
      }

      // Increase the retry count
      config.__retryCount += 1;

      // Create new promise to handle exponential backoff
      var backoff = new Promise(function (resolve) {
        setTimeout(function () {
          resolve();
        }, config.retryDelay || 1);
      });

      // Return the promise in which recalls axios to retry the request
      return backoff.then(function () {
        return axios(config);
      });
    });

    return axios;
  }

  /**
   * Handle errors
   * @param error
   *
   */
  _handleError(error) {

    var errorData = {
      data: error.response.data.message,
      color: 'error'
    };

    switch (error.response.status) {
      case 409:
        store.commit(types.SHOW_SNACKBAR, errorData);
        break;
      case 404:
        errorData.data = 'Something went wrong.';
        store.commit(types.SHOW_SNACKBAR, errorData);
        break;
      case 401:
        this.auth.logout();
        router.push('/login');
        store.commit(types.SHOW_SNACKBAR, errorData);
        break;
      case 403:
        store.commit(types.SHOW_SNACKBAR, errorData);
        break;
      case 500:
        errorData.data = 'Server Internal Error.';
        store.commit(types.SHOW_SNACKBAR, errorData);
        break;
      default:
        store.commit(types.SHOW_SNACKBAR, errorData);
    }

    throw error;
  }
}


export let api = new Api();
