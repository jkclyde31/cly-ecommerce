"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CartModal from "./CartModal";
import { useWixClient } from "../../hooks/useWixClient";
import Cookies from "js-cookie";
import { useCartStore } from "../../hooks/useCartStore";
import { Toast } from "./Toast";

// Define the UserData type
interface MemberProfile {
  nickname?: string;
  name?: string;
  photo?: {
    url?: string;
  };
}

interface UserData {
  member?: {
    profile?: MemberProfile;
  };
}

const NavIcons = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null); // Apply the type here
  const [profilePicture, setProfilePicture] = useState("/profile.png"); 
  const [showToast, setShowToast] = useState(false);

  const router = useRouter();
  const wixClient = useWixClient();

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        console.log("USER DATA: ", data);

        if (data?.user) {
          setUserData(data.user);
          // Update profile picture if user has one
          if (data.user?.member?.profile?.photo?.url) {
            setProfilePicture(data.user.member.profile.photo.url);
          }
          setShowToast(true);
        } else {
          console.log("No user data found.");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUser();
  }, []);

  const login = async () => {
    if (!wixClient.auth.loggedIn()) {
      const loginRequestData = wixClient.auth.generateOAuthData(
        "http://localhost:3000"
      );

      localStorage.setItem("oAuthRedirectData", JSON.stringify(loginRequestData));
      const { authUrl } = await wixClient.auth.getAuthUrl(loginRequestData);
      window.location.href = authUrl;
    } else {
      setIsProfileOpen((prev) => !prev);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    Cookies.remove("refreshToken");
    const { logoutUrl } = await wixClient.auth.logout(window.location.href);
    setIsLoading(false);
    setIsProfileOpen(false);
    setUserData(null); // Clear user data on logout
    setProfilePicture("/profile.png"); // Reset profile picture
    router.push(logoutUrl);
  };

  const { cart, counter, getCart } = useCartStore();

  useEffect(() => {
    getCart(wixClient);
  }, [wixClient, getCart]);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const oAuthRedirectData = localStorage.getItem("oAuthRedirectData");

      if (oAuthRedirectData) {
        const parsedOAuthData = JSON.parse(oAuthRedirectData);
        const returnedOAuthData = wixClient.auth.parseFromUrl();

        if (returnedOAuthData.error) {
          console.error(`Error: ${returnedOAuthData.errorDescription}`);
          return;
        }

        try {
          const memberTokens = await wixClient.auth.getMemberTokens(
            returnedOAuthData.code,
            returnedOAuthData.state,
            parsedOAuthData
          );

          wixClient.updateTokens({
            refreshToken: memberTokens.refreshToken,
            accessToken: memberTokens.accessToken,
          });

          // Fetch user data after successful authentication
          const response = await fetch('/api/user');
          const data = await response.json();
          if (data?.user) {
            setUserData(data.user);
            if (data.user?.profile?.photo?.url) {
              setProfilePicture(data.user.profile.photo.url);
            }
          }

          console.log("Authentication successful!");
        } catch (error) {
          console.error("Failed to get member tokens:", error);
        }
      }
    };

    handleOAuthCallback();
  }, [wixClient]);

  return (
    <div className="flex items-center gap-4 xl:gap-6 relative">
      <Image
        src={profilePicture}
        alt=""
        width={22}
        height={22}
        className="cursor-pointer rounded-full"
        onClick={login}
      />
      {isProfileOpen && (
        <div className="absolute p-4 rounded-md top-12 left-0 bg-white text-sm shadow-[0_3px_10px_rgb(0,0,0,0.2)] z-20">
          {userData ? (
            <div className="mb-2">
              {userData.member?.profile?.nickname || userData.member?.profile?.name || 'User'}
            </div>
          ) : (
            <div className="mb-2">Guest</div>
          )}
          <Link href="/profile">Profile</Link>
          <div className="mt-2 cursor-pointer" onClick={handleLogout}>
            {isLoading ? "Logging out" : "Logout"}
          </div>
        </div>
      )}
      <Image
        src="/notification.png"
        alt=""
        width={22}
        height={22}
        className="cursor-pointer"
      />
      <div
        className="relative cursor-pointer"
        onClick={() => setIsCartOpen((prev) => !prev)}
      >
        <Image src="/cart.png" alt="" width={22} height={22} />
        <div className="absolute -top-4 -right-4 w-6 h-6 bg-lama rounded-full text-white text-sm flex items-center justify-center">
          {counter}
        </div>
      </div>
      {isCartOpen && <CartModal />}
      {showToast && userData && (
        <Toast 
          message={`Welcome back${userData.member?.profile?.nickname ? `, ${userData.member.profile.nickname}` : ''}!`}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default NavIcons;