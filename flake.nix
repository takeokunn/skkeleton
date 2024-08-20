{
  description = "SKK implements for Vim/Neovim";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs = { self, nixpkgs }:
    let
      systems =
        [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];

      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);
    in {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          inherit (pkgs) lib;

          skkeleton = pkgs.vimUtils.buildVimPlugin {
            pname = "skkeleton";
            version = self.shortRev or "dirty";

            src = ./.;
            dependencies = with pkgs.vimPlugins; [ denops-vim ];
            dontBuild = true;
          };

          skkeleton-config = ''
            call skkeleton#config({ 'globalDictionaries': ["${pkgs.skk-dicts}/share/SKK-JISYO.L"] })

            imap <C-j> <Plug>(skkeleton-toggle)
            cmap <C-j> <Plug>(skkeleton-toggle)
          '';
        in {
          default = pkgs.neovim.override {
            configure = {
              customRC = skkeleton-config;
              packages.example.start = [ skkeleton ];
            };
          };
        });
    };
}
