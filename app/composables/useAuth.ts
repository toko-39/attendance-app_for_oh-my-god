import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";

export const useAuth = () => {
  const user = useState<FirebaseUser | null>("auth-user", () => null);
  const loading = useState<boolean>("auth-loading", () => true);

  const auth = useFirebaseAuth();

  onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser;
    loading.value = false;
  });

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    await navigateTo("/login");
  };

  const isAdmin = computed(() => {
    return !!user.value;
  });

  return { user, loading, isAdmin, login, logout };
};
