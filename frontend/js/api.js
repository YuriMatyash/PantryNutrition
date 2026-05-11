async function apiRequest(path, method = "GET", data = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data !== null) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const responseData = await response.json();

  if (!response.ok) {
    const errorMessage = responseData?.detail?.error || responseData?.error || "Request failed.";
    throw new Error(errorMessage);
  }

  return responseData;
}

async function apiGet(path) {
  return apiRequest(path, "GET");
}

async function apiPost(path, data) {
  return apiRequest(path, "POST", data);
}

async function apiPut(path, data) {
  return apiRequest(path, "PUT", data);
}

async function apiDelete(path) {
  return apiRequest(path, "DELETE");
}
