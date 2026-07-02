import { SignUp } from "@clerk/nextjs";
import Image from "next/image";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0e0b1a] flex items-center justify-center px-5">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#7B4FBF]/10 rounded-full blur-[130px]" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[#3AAFD4]/8 rounded-full blur-[110px]" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center gap-8">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9 transition-transform group-hover:scale-110 group-hover:rotate-6">
            <Image
              src="/drawparty.png"
              alt="DrawParty"
              width={36}
              height={36}
              className="rounded-lg object-contain"
            />
          </div>
          <span className="font-syne font-bold text-xl tracking-tight">
            <span className="text-gradient-purple">Draw</span>
            <span className="text-gradient-teal">Party</span>
          </span>
        </a>

        <SignUp
          appearance={{
            variables: {
              colorBackground: "#161228",
              colorInputBackground: "#0e0b1a",
              colorInputText: "#ffffff",
              colorText: "#ffffff",
              colorTextSecondary: "#7a6f99",
              colorPrimary: "#7B4FBF",
              colorDanger: "#FF6B6B",
              borderRadius: "12px",
              fontFamily: "var(--font-dm-sans)",
            },
            elements: {
              card: "bg-[#161228] border border-[#211c38] shadow-2xl",
              headerTitle: "font-syne text-white",
              headerSubtitle: "text-[#7a6f99]",
              socialButtonsBlockButton:
                "bg-[#0e0b1a] border-[#211c38] text-white hover:bg-[#1e1836] transition-colors",
              dividerLine: "bg-[#211c38]",
              dividerText: "text-[#7a6f99]",
              formFieldLabel: "text-[#7a6f99] text-sm",
              formFieldInput:
                "bg-[#0e0b1a] border-[#211c38] text-white focus:border-[#7B4FBF] rounded-xl",
              formButtonPrimary:
                "bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] text-white font-syne font-bold hover:opacity-90 rounded-xl",
              footerActionLink: "text-[#9B6FDF] hover:text-[#7B4FBF]",
              alertText: "text-[#FF6B6B]",
            },
          }}
          redirectUrl="/"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}