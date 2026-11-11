# BRASA BURGER

Site conceitual da Matheus Web Studio. Esta versão usa o HTML e as imagens do projeto anterior, completa o cardápio e a sacola e adiciona o painel administrativo demonstrativo.

## Abrir a demonstração no Windows

1. Extraia o ZIP inteiro. Abra a pasta `brasa-burger` no Explorador de Arquivos.
2. Na barra de endereço dessa pasta, digite `powershell` e pressione Enter.
3. Rode `node servidor.cjs` com o Node.js instalado. Como alternativa, com Python instalado, rode `python -m http.server 8000 --bind localhost`.
4. Abra [o site público](http://localhost:8000/index.html) e [o painel](http://localhost:8000/admin.html). Use o mesmo endereço e a mesma porta para os dois. Encerre com Ctrl+C na janela do servidor.

## Roteiro de apresentação

- Em **Produtos**, altere o preço do Brasa Clássico e salve. O cardápio da outra aba acompanha a alteração. Desmarque a disponibilidade para testar a pausa ou reduza o estoque a zero.
- Em **Categorias**, crie uma categoria e vincule um produto. Para excluir uma categoria em uso, mova ou remova seus produtos primeiro.
- No cardápio, adicione um item à sacola e clique em **Continuar pedido**. Informe nome, telefone e endereço fictícios e selecione a modalidade e a forma de pagamento. Cartão é pago na maquininha da loja. O formulário registra a escolha, sem cobrança online. Confira a prévia e selecione **Registrar pedido simulado**. O pedido entra no painel como recebido e reduz o estoque. O cancelamento repõe as unidades do pedido simulado quando o produto ainda existe.
- Ao rolar o site para além do cabeçalho, a **Sacola** acompanha a tela no canto inferior direito e mostra a quantidade de itens.
- Ao clicar em **Adicionar** em um produto, você pode escrever uma observação como “sem tomate”. O mesmo produto com observações diferentes aparece em linhas separadas. A observação pode ser editada na sacola e aparece na prévia do pedido, no painel e na comanda.
- Em **Banners e conteúdo**, edite a capa, a faixa promocional e o texto institucional. Em **Configurações da loja**, edite os horários, o endereço e o texto de contato. As imagens enviadas ficam no navegador e têm limite de 350 KB por arquivo.
- A **Visão geral** calcula vendas e ticket médio pelos pedidos concluídos. **Clientes** agrupa os pedidos pelo nome fictício informado. Use apenas dados inventados no formulário de demonstração.

## Publicar no Netlify e testar a Elgin i9

1. Extraia o ZIP e arraste a pasta `brasa-burger`, que contém o `index.html`, para o [Netlify Drop](https://app.netlify.com/drop).
2. No site publicado, clique em **Painel demo** no rodapé ou abra `/admin.html`. Em **Pedidos**, abra um pedido fictício e clique em **Imprimir comanda**. Você também pode registrar um novo pedido na sacola do site, no mesmo navegador.
3. No diálogo do navegador, selecione a Elgin i9 instalada no computador. Se sua bobina é de 80 mm, selecione o papel de 80 mm no driver. A comanda usa 72 mm de largura, com margens internas. Comece com escala de 100% e, se o navegador oferecer a opção, desative cabeçalhos e rodapés.
4. Confira a prévia antes de imprimir. A comanda traz número, horário, status, nome do cliente, modalidade, itens, observações e total. Novos pedidos registrados pela sacola também incluem telefone, endereço e forma de pagamento, além da referência quando preenchida.

A impressão é manual pelo navegador. O Netlify hospeda os arquivos desta demonstração. O painel continua aberto, com pedidos fictícios e dados locais ao navegador.

## Dados e acesso

O painel é aberto e identificado como demonstração. Usa `localStorage`, sem backend ou autenticação. As alterações persistem ao recarregar e são compartilhadas entre abas da mesma origem no mesmo perfil do navegador. Cada navegador ou dispositivo tem sua própria demonstração. Para voltar aos dados iniciais, apague os dados do site para esse endereço no navegador.

Para habilitar o contato do cliente com a loja, configure um número real autorizado em **Configurações da loja**, com país, DDD e telefone, apenas dígitos. Após registrar o pedido simulado, **Enviar pedido pelo WhatsApp** abre a conversa da loja com “quero acompanhar meu pedido!”. O valor opcional em `config.js` é usado apenas ao inicializar os dados pela primeira vez.

Em **Pedidos**, **Enviar aceite pelo WhatsApp** abre a conversa com o número informado pelo cliente, com uma mensagem de aceite e o número do pedido. Confirme o envio no WhatsApp. Esse botão não altera o status no painel. O telefone pode ser informado com DDD brasileiro ou com `+` e código do país. Como o armazenamento é local, o pedido só aparece no painel do mesmo navegador. O link do cliente abre uma mensagem de acompanhamento no WhatsApp da loja e não sincroniza o pedido com outro dispositivo.

## Arquivos editáveis

- `index.html`, `app.js` e `styles.css` contêm o site público.
- `admin.html`, `admin.js` e `admin.css` contêm o painel.
- `data.js` contém os dados iniciais e as regras compartilhadas de catálogo, pedidos e estoque.
- `assets/` contém as imagens do projeto anterior, preparadas em WebP.


