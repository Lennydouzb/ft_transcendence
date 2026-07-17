const API = "http://localhost:8080/api";

async function callBackend(endpoint: string, options: RequestInit = {})
{
	const URL = API + endpoint;
	//this is to check if a file is passed (for profile pics)
	const isFormData = options.body instanceof FormData;
	const headers: Record<string, string> = {...options.headers as Record<string, string>,};
	if (!isFormData)
		headers["Content-Type"] = "application/json";
	try
	{
		const response = await fetch (URL,{
			...options,
			headers
		});
		if (!response.ok){
			throw new Error("This endpoint couldn't be called");
		}
		return await response.json();
	} catch (error)
	{
		console.error("Error:", error);
		throw error;
	}
}

export async function fetchUsers()
{
	return callBackend("/users")
}

export async function fetchGames()
{
	return callBackend("/games")
}

export async function fetchProjects()
{
	return callBackend("/projects")
}

export async function fetchParticipants(idGame: number)
{
	return callBackend('/gameParticipants', {
		method: 'POST',
		body: JSON.stringify({ idGame }),
	});
}

export async function fetchUserGames(idUser: number)
{
	return callBackend('/userGames', {
		method: 'POST',
		body: JSON.stringify({ idUser }),
	});
}

export async function fetchGameProjects(idGame: number)
{
	return callBackend('/gameProjects', {
		method: 'POST',
		body: JSON.stringify({ idGame }),
	});
}

export async function fetchCreateUser(nameA: string, passwordA: string, mailA: string)
{
	return callBackend('/createUser', {
		method: 'POST',
		body: JSON.stringify({ name: nameA,
							 password: passwordA,
							 mail: mailA}),
	});
}

export async function fetchLogin(mailA: string, passwordA: string)
{
	return callBackend('/login', {
		method: 'POST',
		body: JSON.stringify({password: passwordA,
							 mail: mailA}),
	});
}

export async function fetchCreateProject(linkA: string, nameA: string, token: string)
{
	return callBackend('/createProject', {
		method: 'POST',
		body: JSON.stringify({link: linkA,
								name: nameA}),
		headers: {'Authorization': `Bearer ${token}`}
	});
}

export async function fetchCreateGame(nameA: string, token: string)
{
	return callBackend('/createGame', {
		method: 'POST',
		body: JSON.stringify({name: nameA}),
		headers: {'Authorization': `Bearer ${token}`}
	});
}
/*disabled express route we might need the code later (desync with websocket)
 * export async function fetchcreateQuestions(projects: number[], idGame: number, token: string)
{
	return callBackend('/createQuestions', {
		method: 'POST',
		body: JSON.stringify({projects,
								idGame}),
		headers: {'Authorization': `Bearer ${token}`}
	});
}

export async function fetchCreateParticipants(users: number[], idGame: number, token: string)
{
	return callBackend('/createParticipants', {
		method: 'POST',
		body: JSON.stringify({users,
								idGame}),
		headers: {'Authorization': `Bearer ${token}`}
	});
}*/

export async function fetchUpdateUserName(name: string, token: string)
{
	return callBackend('/updateUserName', {
		method: 'PUT',
		body: JSON.stringify({name}),
		headers: {'Authorization': `Bearer ${token}`}
	});
}

export async function fetchUpdateUserImage(image: File, token: string)
{
	const formData = new FormData();
	formData.append('img', image);
	return callBackend('/updateUserImage', {
		method: 'PUT',
		body: formData,
		headers: {'Authorization': `Bearer ${token}`}
	});
}

export async function fetchDeleteUserImage(token: string)
{
	return callBackend('/deleteUserImage', {
		method: 'DELETE',
		headers: {'Authorization': `Bearer ${token}`}
	});
}
