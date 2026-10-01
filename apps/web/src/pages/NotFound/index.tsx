import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

/** 404 兜底页 —— 命中未定义路由时展示 */
export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle="页面不存在或已被移除"
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          回首页
        </Button>
      }
    />
  );
}
