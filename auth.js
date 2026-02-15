async function checkAuth() {
  const supabase = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function requireAuth(redirectTo = 'login.html') {
  const session = await checkAuth();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}

async function checkAdmin() {
  const session = await checkAuth();
  if (!session) return false;
  
  const supabase = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', session.user.email)
      .maybeSingle();
    
    return !error && data;
  } catch (error) {
    return false;
  }
}

async function requireAdmin() {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    alert('Access denied. Admin only.');
    window.location.href = 'Dashboard.html';
    return false;
  }
  return true;
}