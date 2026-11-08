import http from '$lib/api/http';

/** Account endpoints under `/api/client/account`, ported from `api/routes/account/index.ts`. */

export async function updateAccountEmail(email: string, password: string): Promise<void> {
    // The current password is required by the backend to confirm the change.
    await http.put('/api/client/account/email', { email, password });
}

export async function updateAccountPassword(values: {
    current: string;
    password: string;
    confirmPassword: string;
}): Promise<void> {
    await http.put('/api/client/account/password', {
        current_password: values.current,
        password: values.password,
        password_confirmation: values.confirmPassword,
    });
}

export async function updateAccountAvatarUrl(avatarUrl: string): Promise<string | null> {
    const { data } = await http.post('/api/client/account/avatar', { avatar_url: avatarUrl });

    return data.attributes.avatar_url;
}

export async function uploadAccountAvatar(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append('avatar', file);

    const { data } = await http.post('/api/client/account/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data.attributes.avatar_url;
}

export async function removeAccountAvatar(): Promise<void> {
    await http.delete('/api/client/account/avatar');
}

/**
 * Completes onboarding for an account registered through SSO, which starts with a
 * placeholder `null_user_` username. The backend logs the session out on success, so
 * the caller must send the user to `/auth/login` — no client state survives.
 */
export async function setupAccount(values: { username: string; password: string }): Promise<void> {
    await http.post('/api/client/account/setup', values);
}
