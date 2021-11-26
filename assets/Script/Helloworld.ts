/**
 * logan ai
 */
const { ccclass, property } = cc._decorator;

@ccclass
export default class Helloworld extends cc.Component {
    @property(cc.Label)
    tipLabel: cc.Label = null;

    @property(cc.Label)
    timeLabel: cc.Label = null;

    @property(cc.Label)
    scoreLabel: cc.Label = null;

    @property(cc.Label)
    maxScoreLabel: cc.Label = null;

    @property(cc.Label)
    moveLabel: cc.Label = null;

    @property(cc.Node)
    playButton: cc.Node = null;

    @property(cc.EditBox)
    levelEditBox: cc.EditBox = null;

    @property(cc.EditBox)
    tokenEditBox: cc.EditBox = null;

    private urlHead: string = 'https://test-api-6699.mathufo.com';
    private token: string = 'danliu';
    private gameTime: number = 0;
    private gameScore: number = 0;
    private maxScore: number = 0;
    private isFinish: boolean = false;
    private level: number = 1;
    private board: any = [];
    private autoPlay: boolean = false;
    private moveCount: number = 0;


    start() {
        /**
         *  - board是一个二维数组，依次描述5列。每一列的第0个元素就是最底下的那个，从下往上描述。
            - 数值对应关系
            - 0: 1分
            - 1: 5分
            - 2: 1角
            - 3: 5角
            - 4: 1元
            - 61: 袋子
            - score表示当前得分，会有小数，单位元。
            - height是一个[0,1)的浮点数，表示顶上冒出来的一部分硬币。满1就会加一行。
            - finished表示是否结束。结束之后就不能继续操作了。
            - error表示请求有问题，按照错误提示修改。有error的时候其它字段就都不返回了。
         */

        this.schedule(() => {
            if (!this.isFinish) {
                this.gameTime++;
                this.maxScore = this.maxScore < this.gameScore ? this.gameScore : this.maxScore;
                this.timeLabel.string = '时长：' + this.gameTime;
                this.scoreLabel.string = '当前得分：' + this.gameScore;
                this.maxScoreLabel.string = '最高得分：' + this.maxScore;
                this.tipLabel.string = '大兄弟，跑起来吧';
            } else {
                console.log('游戏结束');
                this.tipLabel.string = '大兄弟，game over';
                // this.onGameStart();
            }
        }, 1);

        this.playButton.on('click', this.onClickPlay, this);
        this.levelEditBox.string = this.level + '';
        this.tokenEditBox.string = this.token;
    }

    private getAiMove1() {
        let r = null;
        const index = this.board.findIndex((e) => e[0] == 61);
        if (index != -1) {
            let max = 0;
            let pos = 0;
            for (let i = 0; i < this.board.length; i++) {
                if (i !== index && this.board[i].length > 0) {
                    const number = this.board[i][0];
                    const count = this.getNumberCount(number);
                    if (max < count) {
                        max = count;
                        pos = i;
                    }
                }
            }
            if (pos != index) {
                r = { from: index, to: pos };
            }
        }
        return r;
    }

    private getNumberCount(number: number) {
        let count = 0;
        for (let i = 0; i < this.board.length; i++) {
            for (let j = 0; j < this.board[i].length.length; j++) {
                if (this.board[i][j] == number) {
                    count++;
                }
            }
        }
        return count;
    }

    private getAiMove() {
        // 先判断福袋
        const r1 = this.getAiMove1();
        if (r1) { return r1; }
        const r2 = this.getAiMove2();
        if (r2) { return r2; }
        return this.getAiMove3();
    }

    /**
     * 策略1:获取不太智能的操作（寻找最多相同的）
     * @returns 
     */
    private getAiMove2() {
        const canList = [];
        const length = this.board.length;
        for (let i = 0; i < length - 1; i++) {
            const list = this.board[i];
            if (list.length > 0) {
                const firstNum = list[0];
                for (let j = i + 1; j < length; j++) {
                    const list2 = this.board[j];
                    if (list2.length > 0) {
                        const firstNum2 = list2[0];
                        if (firstNum == firstNum2) {
                            canList.push({ from: i, to: j })
                        }
                    }
                }
            }
        }
        let from = 0;
        let to = 1;
        if (canList.length > 0) {
            let count = 0;
            for (let i = 0; i < canList.length; i++) {
                const fromList = this.board[canList[i].from];
                const toList = this.board[canList[i].to];
                const number = fromList[0];
                let numCount = 2;
                for (let j = 1; j < fromList.length; j++) {
                    if (fromList[j] != number) {
                        break;
                    } else {
                        numCount++;
                    }
                }
                for (let j = 1; j < toList.length; j++) {
                    if (toList[j] != number) {
                        break;
                    } else {
                        numCount++;
                    }
                }
                if (numCount > count) {
                    // 长的列移到短的列
                    if (this.board[canList[i].from].length > this.board[canList[i].to].length) {
                        from = canList[i].from;
                        to = canList[i].to;
                    } else {
                        from = canList[i].to;
                        to = canList[i].from;
                    }
                    count = numCount;
                }
            }
            return { from, to };
        }
        return null;
    }

    /**
     * 策略2： 最短列到次短列
     */
    private getAiMove3() {
        let tempList = [];
        for (let i = 0; i < this.board.length; i++) {
            tempList[i] = { index: i, length: this.board[i].length };
        }
        tempList.sort((A, B) => {
            return A.length - B.length;
        });
        const from = tempList[0].index;
        const to = tempList[1].index;
        return { from, to };
    }

    private onClickPlay() {
        this.autoPlay = true;
        this.onGameStart();
    }

    private onGameStart() {
        this.moveCount = 0;
        this.level = Number(this.levelEditBox.string);
        this.token = this.tokenEditBox.string;
        this.sendInit(this.level);
    }

    private sendInit(level: number) {
        const url = this.urlHead + '/init?token=' + this.token + '&level=' + level;
        this.sendHttpRequest((data: any) => {
            console.log('==> init data', data);
            this.gameScore = data.score;
            this.isFinish = data.finished;
            this.board = data.board;
            if (!this.isFinish && this.autoPlay) {
                const ai = this.getAiMove();
                this.sendMove(this.level, ai.from, ai.to);
            }
        }, 'GET', url);
    }

    private sendMove(level: number, from: number, to: number) {
        this.moveCount++;
        this.moveLabel.string = '操作次数：' + this.moveCount;
        const url = this.urlHead + '/move?token=' + this.token + '&level=' + level + '&from=' + from + '&to=' + to;
        this.sendHttpRequest((data: any) => {
            console.log('==> move data', data);
            this.gameScore = data.score;
            this.isFinish = data.finished;
            this.board = data.board;
            if (!this.isFinish && this.autoPlay) {
                const ai = this.getAiMove();
                this.sendMove(this.level, ai.from, ai.to);
            }
        }, 'GET', url);
    }

    private sendHttpRequest(cb: Function = null, method: string = 'GET', url: string | URL, async: boolean = true, data: any = null) {
        console.log('==> url', url);
        const xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function () {
            // console.log('==> xmlHttp', xmlHttp);
            if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
                const responseText = JSON.parse(xmlHttp.responseText);
                // console.log('==> responseText', responseText);
                cb && cb(responseText);
            }
        };
        xmlHttp.open(method, url, async);
        xmlHttp.send(data);
    }
}
