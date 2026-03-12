const spinner = document.getElementById('global-spinner');


const { fetch: originalFetch } = window;

window.fetch = async (...args) => {
    spinner.classList.remove('d-none');

    try {
        const response = await originalFetch(...args);
        return response;
    } catch (error) {
        return Promise.reject(error);
    } finally {
        spinner.classList.add('d-none');
    }
};